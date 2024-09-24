const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Set up storage for Multer (store images locally)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate a unique name
  },
});

const upload = multer({ storage });

// Serve static files from the public directory
app.use(express.static('public'));

// Serve the uploads folder to access the generated PDF
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to handle image upload and conversion
app.post('/convert', upload.array('images'), async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const imagePath = path.join(__dirname, 'uploads', file.filename);

      // Convert the image to PNG format
      const imageBuffer = await sharp(imagePath).png().toBuffer();

      // Add the image to the PDF
      const image = await pdfDoc.embedPng(imageBuffer);
      const page = pdfDoc.addPage([image.width, image.height]); // Adjust page size to image size
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // Save the PDF and store it temporarily on the server
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(__dirname, 'uploads', 'output.pdf');
    fs.writeFileSync(pdfPath, pdfBytes);

    // Send the PDF path as a response
    res.json({ pdfPath: '/uploads/output.pdf' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
