#!/bin/bash
# Check if pnpm is installed
if ! command -v pnpm &> /dev/null
then
    echo "pnpm could not be found, installing..."
    # Install pnpm globally
    npm install -g pnpm
else
    echo "pnpm is already installed"
fi

pnpm install

echo "Copying pdfmake files to pdfmake/build"
cp pdfmake/pdfmake.js node_modules/pdfmake/build/pdfmake.js
cp pdfmake/vfs_fonts.js node_modules/pdfmake/build/vfs_fonts.js
echo "Sucess"