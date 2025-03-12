const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static("public"));

// Set up express-fileupload middleware
app.use(
  fileUpload({
    createParentPath: true, // Creates the directory if it doesn't exist
  })
);

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

app.post("/formSubmit", (req, res) => {
  // Check if files were uploaded
  if (!req.files || !req.files.image) {
    return res.status(400).send("No product image was uploaded.");
  }

  //req.files is an object that contains the uploaded files
  const uploadedImage = req.files.image;

  // Access form data
  const make = req.body.make;
  const model = req.body.model;
  const price = req.body.price;
  const description = req.body.description;

  // Create a unique filename
  const fileName = Date.now() + path.extname(uploadedImage.name);
  const uploadPath = __dirname + "/uploads/" + fileName;

  // Create product object
  const newProduct = {
    id: Date.now().toString(), // Simple unique ID
    make,
    model,
    price: parseFloat(price),
    description,
    imageFileName: fileName,
    createdAt: new Date().toISOString(),
  };

  // Log the product data
  console.log("Product data:", newProduct);

  // .mv() is a method that moves the file
  uploadedImage.mv(uploadPath, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

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
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
