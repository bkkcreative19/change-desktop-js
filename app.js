import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import { BlockBlobClient, BlobServiceClient } from "@azure/storage-blob";
import getStream from "into-stream";
import dotenv from "dotenv";
import { EventHubProducerClient } from "@azure/event-hubs";
import path from "path";

import filesPayloadExists from "./middleware/filesPayloadExits.js";
import fileExtLimiter from "./middleware/fileExtLimiter.js";
import fileSizeLimiter from "./middleware/fileSizeLimiter.js";

import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post(
  "/upload",
  fileUpload({ createParentPath: true }),
  filesPayloadExists,
  fileExtLimiter([".png", ".jpg", ".jpeg"]),
  fileSizeLimiter,
  async (req, res) => {
    const files = req.files;
    // console.log(files);
    const eventHubName = "yayyyyyyyyy";
    const producer = new EventHubProducerClient(
      "Endpoint=sb://testing-kris.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=VQarsMlpLhMEVu24PyMQzGZJgIlijkE7NXsU33cDab4=",
      eventHubName
    );

    const batch = await producer.createBatch();
    batch.tryAdd({ body: "First event" });

    await producer.sendBatch(batch);

    // Close the producer client.
    await producer.close();

    console.log("A batch of three events have been sent to the event hub");

    const getBlobName = (originalName) => {
      const identifier = Math.random().toString().replace(/0\./, ""); // remove "0." from start of string
      return `${identifier}-${originalName}`;
    };

    Object.keys(files).forEach(async (key) => {
      if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        throw Error("Azure Storage Connection string not found");
      }

      const blobName = getBlobName(files[key].name);

      const data = getStream(files[key].data);
      const length = files[key].data.length;

      const blobService = new BlockBlobClient(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        process.env.AZURE_STORAGE_CONTAINER_NAME,
        blobName
      );

      const stream = getStream(files[key].data);
      const streamLength = files[key].data.length;
      blobService
        .uploadStream(stream, streamLength, 5, {
          blobHTTPHeaders: { blobContentType: "image/jpeg" },
        })
        .then((data) => {
          console.log(blobName);
        })
        .catch((err) => {
          if (err) {
            console.log(err);
            // handleError(err);
            return;
          }
        });
    });

    return res.json({
      status: "success",
      message: Object.keys(files).toString(),
    });
  }
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
