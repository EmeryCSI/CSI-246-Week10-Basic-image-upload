const express = require("express");
// Multer is a middleware for handling multipart/form-data, primarily used for uploading files
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

// === MULTER CONFIGURATION ===

// Configure where and how multer will store uploaded files
// diskStorage lets us control both the destination folder and filename
const storage = multer.diskStorage({
  // Set the destination folder where uploaded files will be saved
  destination: function (req, file, cb) {
    // The callback takes two parameters: error (null if no error) and destination path
    cb(null, "uploads/");
  },
  // Define how filenames will be generated for uploaded files
  filename: function (req, file, cb) {
    // Create a unique filename using current timestamp + original file extension
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Create a filter to only allow certain file types
// This prevents users from uploading non-image files
const fileFilter = (req, file, cb) => {
  // Check if the file extension matches allowed image formats
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    // If not an allowed format, reject the file with an error message
    return cb(new Error("Only image files are allowed!"), false);
  }
  // If file passes the check, accept it
  cb(null, true);
};

// Initialize multer with our configuration options
const upload = multer({
  storage: storage, // Use the storage configuration we defined above
  fileFilter: fileFilter, // Use the file filter we defined above
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB to prevent large uploads
  },
});

// Serve static files from the public directory
app.use(express.static("public"));
// These middlewares parse form data and JSON data in requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Path to our products JSON file
const productsFilePath = path.join(__dirname, "products.json");

// Helper function to read products from JSON file
function readProducts() {
  if (!fs.existsSync(productsFilePath)) {
    return []; // Return empty array if file doesn't exist yet
  }

  try {
    const data = fs.readFileSync(productsFilePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading products file:", err);
    return [];
  }
}

// Helper function to write products to JSON file
function writeProducts(products) {
  try {
    fs.writeFileSync(
      productsFilePath,
      JSON.stringify(products, null, 2),
      "utf8"
    );
    return true;
  } catch (err) {
    console.error("Error writing products file:", err);
    return false;
  }
}

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Route for /form to serve the form.html file
app.get("/form", (req, res) => {
  res.sendFile(__dirname + "/public/form.html");
});

// Route to view all products
app.get("/products", (req, res) => {
  const products = readProducts();

  let productList = `
    <h1>Product List</h1>
    <a href="/form">Add New Product</a>
    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 20px;">
  `;

  products.forEach((product) => {
    productList += `
      <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; width: 300px;">
        <h2>${product.make} ${product.model}</h2>
        <p><strong>Price:</strong> $${product.price}</p>
        <p><strong>Description:</strong> ${product.description || "N/A"}</p>
        <img src="/uploads/${
          product.imageFileName
        }" style="max-width: 100%; max-height: 200px;">
      </div>
    `;
  });

  productList += `</div>`;

  res.send(productList);
});

// === MULTER IN ACTION ===

// The upload.single('image') middleware processes a single file upload
// 'image' must match the name attribute in the HTML form's file input
app.post("/formSubmit", upload.single("image"), (req, res) => {
  // After multer processes the upload, the file details are available in req.file
  // If no file was uploaded or there was an error, req.file will be undefined
  if (!req.file) {
    return res.status(400).send("No product image was uploaded.");
  }

  // Access form data from req.body (multer doesn't interfere with text fields)
  const make = req.body.make;
  const model = req.body.model;
  const price = req.body.price;
  const description = req.body.description;

  // Multer has already saved the file to the uploads directory
  // We can access the generated filename from req.file.filename
  const fileName = req.file.filename;

  // Create product object
  const newProduct = {
    id: Date.now().toString(), // Simple unique ID
    make,
    model,
    price: parseFloat(price),
    description,
    imageFileName: fileName, // Store the filename multer generated
    createdAt: new Date().toISOString(),
  };

  // Log the product data
  console.log("Product data:", newProduct);

  // Save product data to JSON file
  const products = readProducts();
  products.push(newProduct);
  writeProducts(products);

  // Send a success response with product details
  res.send(`
    <h1>Product Added Successfully!</h1>
    <p><strong>Make:</strong> ${make}</p>
    <p><strong>Model:</strong> ${model}</p>
    <p><strong>Price:</strong> $${price}</p>
    <p><strong>Description:</strong> ${description || "N/A"}</p>
    <p><strong>Image:</strong> ${fileName}</p>
    <img src="/uploads/${fileName}" style="max-width: 300px;">
    <div style="margin-top: 20px;">
      <a href="/form">Add Another Product</a> | 
      <a href="/products">View All Products</a>
    </div>
  `);
});

// Serve uploaded files from the uploads directory
// This makes the uploaded images accessible via /uploads/filename
app.use("/uploads", express.static("uploads"));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
