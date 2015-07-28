/// <reference path="node.d.ts" />
/// <reference path="es6-promise.d.ts" />

import fs = require('fs');

interface Parser {
    (options: Object): NodeJS.ReadWriteStream;
}

var parse = <Parser> require('csv-parse');

var csvStream = parse({});
var inStream = process.stdin;

inStream.pipe(csvStream);

// Buffer of up to 1000 rows
var buffer: string[][] = [];
var bufferClosed = false;

// Max width of each column observed so far
var widths = [];

function updateWidths(row: string[]) {
    for (var i = 0; i < row.length; i++) {
        // Pad by 1 character
        var fieldWidth = row[i].length + 1;

        if (widths[i] == null || fieldWidth > widths[i])
            widths[i] = fieldWidth;
    }
}

function printRow(row: string[]) {
    for (var i = 0; i < row.length; i++) {
        var field = row[i];

        // Write field to stdout
        process.stdout.write(field);

        // Pad column to desired width
        var fieldWidth = field.length;
        var desiredWidth = widths[i];

        for (var pad = fieldWidth; pad < desiredWidth; pad++)
            process.stdout.write(' ');
    }

    process.stdout.write('\n');
}

/**
 * Close the buffer, update widths, and print its contents to stdout
 */
function drainBuffer() {
    assert(!bufferClosed, 'Buffer is already closed');

    bufferClosed = true;

    // Set widths based on first 1000 rows
    buffer.forEach(updateWidths);

    // Print buffer rows to stdout
    buffer.forEach(printRow);
}

/**
 * Print currently readable rows to stdout
 */
function printReadableRows() {
    var row: string[];

    while (row = <any> csvStream.read())
        printRow(row);
}

function bufferReadableRows() {
    var row: string[];

    while (row = <any> csvStream.read())
        buffer.push(row);
}

csvStream.on('readable', () => {
    // If buffer is full, close it
    if (buffer.length > 1000)
        drainBuffer();

    // Write rows to stdout
    if (bufferClosed)
        printReadableRows();
    else
        bufferReadableRows();
});

// Exit on error
csvStream.on('error', err => {
    console.error(err.message);

    process.exit(1);
});

// When finished reading CSV, wait for stdout to drain
csvStream.on('finish', () => {
    // If buffer never filled up and then got closed, print its rows now
    if (!bufferClosed)
        drainBuffer();

    process.stdout.on('drain', () => {
        // implicitly exit
    });
});

function assert(truthy, message: string) {
    if (!truthy)
        throw new Error(message);
}