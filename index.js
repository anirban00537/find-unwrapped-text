const fs = require("fs");
const path = require("path");
const glob = require("glob");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

// Regular expressions to check for wrapping in t() function and to identify URLs
const tWrappedRegex = /t\(["'`].*["'`]\)/;
const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/;

const findUnwrappedText = (dir) => {
  const results = [];

  // Use glob to find all JSX and TSX files in the directory
  const files = glob.sync(`${dir}/**/*.{jsx,tsx}`, { absolute: true });

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");

    let ast;
    try {
      ast = parser.parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
      });
    } catch (error) {
      console.error(`Error parsing file: ${file}`);
      console.error(error.message);
      return;
    }

    traverse(ast, {
      ImportDeclaration(path) {
        // Ignore import declarations
        path.skip();
      },
      JSXText(path) {
        const textValue = path.node.value.trim();
        if (
          textValue &&
          !tWrappedRegex.test(textValue) &&
          !urlRegex.test(textValue)
        ) {
          results.push({ file, text: textValue });
        }
      },
      JSXAttribute(path) {
        // Ignore className attributes
        if (t.isJSXIdentifier(path.node.name, { name: "className" })) {
          return;
        }

        if (t.isStringLiteral(path.node.value)) {
          const textValue = path.node.value.value.trim();
          if (
            textValue &&
            !tWrappedRegex.test(textValue) &&
            !urlRegex.test(textValue)
          ) {
            results.push({ file, text: textValue });
          }
        }

        if (t.isJSXExpressionContainer(path.node.value)) {
          const expression = generate(path.node.value.expression).code;
          if (
            expression &&
            !tWrappedRegex.test(expression) &&
            !urlRegex.test(expression)
          ) {
            const match = expression.match(/(["'`])(?:(?=(\\?))\2.)*?\1/);
            if (match) {
              const textValue = match[0].slice(1, -1).trim();
              if (
                textValue &&
                !tWrappedRegex.test(textValue) &&
                !urlRegex.test(textValue)
              ) {
                results.push({ file, text: textValue });
              }
            }
          }
        }
      },
      StringLiteral(path) {
        const parent = path.findParent(
          (p) =>
            t.isJSXAttribute(p.node) &&
            t.isJSXIdentifier(p.node.name, { name: "className" })
        );
        if (!parent) {
          const textValue = path.node.value.trim();
          if (
            textValue &&
            !tWrappedRegex.test(textValue) &&
            !urlRegex.test(textValue)
          ) {
            results.push({ file, text: textValue });
          }
        }
      },
      TemplateLiteral(path) {
        const parent = path.findParent(
          (p) =>
            t.isJSXAttribute(p.node) &&
            t.isJSXIdentifier(p.node.name, { name: "className" })
        );
        if (!parent) {
          path.node.quasis.forEach((element) => {
            const textValue = element.value.cooked.trim();
            if (
              textValue &&
              !tWrappedRegex.test(textValue) &&
              !urlRegex.test(textValue)
            ) {
              results.push({ file, text: textValue });
            }
          });
        }
      },
    });
  });

  return results;
};

const writeResultsToFile = (results, outputFile) => {
  const outputStream = fs.createWriteStream(outputFile);

  results.forEach((result) => {
    outputStream.write(`File: ${result.file}\n`);
    outputStream.write(`Unwrapped Text=============> ${result.text}\n\n`);
  });

  outputStream.end();
};

// Main function to run the script
const main = (directoryToSearch, outputFile) => {
  const results = findUnwrappedText(directoryToSearch);
  writeResultsToFile(results, outputFile);
  console.log(`Search complete. Results written to ${outputFile}`);
};

module.exports = main;
