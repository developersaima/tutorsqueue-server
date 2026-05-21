import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.PUBLIC_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.log(error);
    return res.status(403).send("Forbidden");
  }
};

async function run() {
  try {
    await client.connect();

    const db = client.db("medi-queue");
    const tutorsCollection = db.collection("tutors");
    const bookingsCollection = db.collection("bookings");
    // add tutrs
    app.post("/api/tutors", verifyToken, async (req, res) => {
      try {
        const tutorData = req.body;

        const result = await tutorsCollection.insertOne(tutorData);

        res.status(201).send({ message: "Tutor added successfully", result });
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    });
    // get tutor
    app.get("/api/tutors", async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        let query = {};

        if (startDate || endDate) {
          query.sessionStartDate = {};
          if (startDate) query.sessionStartDate.$gte = startDate;
          if (endDate) query.sessionStartDate.$lte = endDate;
        }

        const result = await tutorsCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch tutors" });
      }
    });

    // id toutor
    app.get("/api/tutors/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Tutor ID" });
        }

        const query = { _id: new ObjectId(id) };
        const tutor = await tutorsCollection.findOne(query);

        if (!tutor) {
          return res.status(404).send({ message: "Tutor not found" });
        }

        res.status(200).send(tutor);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch tutor details" });
      }
    });

    // bookign

    app.post("/api/bookings", verifyToken, async (req, res) => {
      try {
        const { tutorId, studentName, studentEmail, studentPhone } = req.body;

        if (req.user?.email !== studentEmail) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        if (!ObjectId.isValid(tutorId)) {
          return res.status(400).send({ message: "Invalid Tutor ID" });
        }

        const tutor = await tutorsCollection.findOne({
          _id: new ObjectId(tutorId),
        });
        if (!tutor) {
          return res.status(404).send({ message: "Tutor not found" });
        }

        const currentSlots = parseInt(tutor.totalSlot, 10);
        if (isNaN(currentSlots) || currentSlots <= 0) {
          return res.status(400).send({ message: "No available slots left." });
        }

        const currentDate = new Date();
        const sessionDate = new Date(tutor.sessionStartDate);
        if (currentDate < sessionDate) {
          return res
            .status(400)
            .send({ message: "Booking is not available yet for this tutor" });
        }

        const bookingInfo = {
          tutorId: new ObjectId(tutorId),
          tutorName: tutor.name || tutor.tutorName,
          studentName,
          email: studentEmail,
          phone: studentPhone,
          status: "booked",
          bookedAt: new Date(),
        };

        await bookingsCollection.insertOne(bookingInfo);

        await tutorsCollection.updateOne(
          { _id: new ObjectId(tutorId) },
          { $set: { totalSlot: (currentSlots - 1).toString() } },
        );

        res
          .status(201)
          .send({ success: true, message: "Booking completed successfully" });
      } catch (error) {
        console.error(" Booking Error:", error); // ব্যাকএন্ড টার্মিনালে আসল সমস্যা দেখার জন্য
        res.status(500).send({ message: "Booking failed server side" });
      }
    });

    // my bookigns
    app.get("/api/my-bookings", verifyToken, async (req, res) => {
      try {
        const studentEmail = req.user?.email;

        if (!studentEmail) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }

        const query = { email: studentEmail };
        const result = await bookingsCollection.find(query).toArray();

        res.status(200).send(result);
      } catch (error) {
        console.error(" Error fetching my bookings:", error);
        res.status(500).send({ message: "Failed to fetch bookings" });
      }
    });

    // cancel bookings

    app.patch("/api/bookings/:id/cancel", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const studentEmail = req.user?.email;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Booking ID" });
        }

        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!booking) {
          return res.status(404).send({ message: "Booking not found" });
        }

        if (booking.email !== studentEmail) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { status: "canceled" },
        };

        const result = await bookingsCollection.updateOne(filter, updateDoc);

        if (booking.tutorId) {
          const tutorSlots = parseInt(
            (await tutorsCollection.findOne({ _id: booking.tutorId }))
              ?.totalSlot,
            10,
          );
          if (!isNaN(tutorSlots)) {
            await tutorsCollection.updateOne(
              { _id: booking.tutorId },
              { $set: { totalSlot: (tutorSlots + 1).toString() } },
            );
          }
        }

        res.status(200).send({
          success: true,
          message: "Booking canceled successfully",
          result,
        });
      } catch (error) {
        console.error(" Error canceling booking:", error);
        res.status(500).send({ message: "Failed to cancel booking" });
      }
    });

    app.get("/api/my-tutors", verifyToken, async (req, res) => {
      try {
        const userId = req.user.uid; // টোকেন থেকে পাওয়া ইউজারের আইডি
        const query = { creatorId: userId }; // ইমেইলের বদলে আইডি দিয়ে ফিল্টার
        const result = await tutorsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed" });
      }
    });
    // UPDATE TUTOR
    app.put("/api/tutors/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const userId = req.user?.id; 
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Tutor ID" });
        }

        // Find tutor
        const tutor = await tutorsCollection.findOne({ _id: new ObjectId(id) });
        if (!tutor) {
          return res.status(404).send({ message: "Tutor not found" });
        }

       
        if (tutor.userId && tutor.userId !== userId) {
          return res
            .status(403)
            .send({
              message: "Forbidden: You can only update your own tutor profile",
            });
        }

        
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: updatedData.tutorName,
            photo: updatedData.photo,
            subject: updatedData.subject,
            availableSlots: updatedData.availableSlots,
            hourlyFee: updatedData.hourlyFee,
            totalSlot: updatedData.totalSlot,
            sessionStartDate: updatedData.sessionStartDate,
            institution: updatedData.institution,
            experience: updatedData.experience,
            location: updatedData.location,
            teachingMode: updatedData.teachingMode,
          },
        };

        const result = await tutorsCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.status(200).send({
            success: true,
            message: "Tutor updated successfully",
          });
        } else {
          res.status(400).send({
            message: "No changes made or tutor data is already up to date",
          });
        }
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({
          message: "Failed to update tutor details",
          error: error.message,
        });
      }
    });

    // DELETE TUTOR 
    app.delete("/api/tutors/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const userId = req.user?.id; 
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Tutor ID" });
        }

        // Find tutor
        const tutor = await tutorsCollection.findOne({ _id: new ObjectId(id) });
        if (!tutor) {
          return res.status(404).send({ message: "Tutor not found" });
        }

        // ownership check
        if (tutor.userId && tutor.userId !== userId) {
          return res.status(403).send({
            message: "Forbidden: You can only delete your own tutor profile",
          });
        }

        // Delete tutor
        const query = { _id: new ObjectId(id) };
        const result = await tutorsCollection.deleteOne(query);

        if (result.deletedCount > 0) {
          res.status(200).send({
            success: true,
            message: "Tutor deleted successfully",
          });
        } else {
          res.status(400).send({
            message: "Failed to delete tutor",
          });
        }
      } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).send({
          message: "Failed to delete tutor",
          error: error.message,
        });
      }
    });
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
}

export default app;
