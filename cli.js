const fs = require("fs");
const path = require("path");
const main = require("./index");

// Function to validate and resolve the input path
const getDirectoryToSearch = () => {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Please provide a directory path to search.");
    process.exit(1);
  }

  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`The provided path does not exist: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
};

// Main function to handle CLI input
const run = () => {
  const directoryToSearch = getDirectoryToSearch();
  const outputFile = path.join(process.cwd(), "unwrapped_text_results.txt");
  main(directoryToSearch, outputFile);
};

// Run the CLI function
run();
