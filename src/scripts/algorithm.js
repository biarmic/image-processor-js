const MODE = {
    ORIGINAL: "original",
    FLIP: "flip",
    GRAYSCALE: "grayscale",
    MONOCHROME: "monochrome",
    DICHROME: "dichrome",
    GLASS: "glass",
    BLUR: "blur",
    POSTERIZE: "posterize"
}

/**
 * Applies the specified filter mode to the original ImageData and modifies it.
 * @param {string} filterMode 
 */
ImageData.prototype.filter = function (filterMode) {
    if (filterMode == MODE.FLIP) {
        flipFilter(this, document.getElementById("flip-axis").value);
    }
    if (filterMode == MODE.GRAYSCALE) {
        var mode = document.getElementById("grayscale-mode").value;
        var secondMode = null;
        if (mode == "decomposition")
            secondMode = document.getElementById("decomposition-mode").value;
        else if (mode == "single-color")
            secondMode = document.getElementById("single-color-mode").value;
        grayscaleFilter(this, mode, secondMode);
    }
    if (filterMode == MODE.MONOCHROME) {
        monochromeFilter(this, document.getElementById("monochrome-mode").value);
    }
    if (filterMode == MODE.DICHROME) {
        dichromeFilter(this, document.getElementById("dichrome-mode").value);
    }
    if (filterMode == MODE.GLASS) {
        glassFilter(this, parseInt(document.getElementById("glass-thickness").value));
    }
    if (filterMode == MODE.BLUR) {
        var mode = document.getElementById("blur-mode").value;
        var secondMode = null;
        if (mode == "motion")
            secondMode = document.getElementById("motion-blur-mode").value;
        blurFilter(this, parseInt(document.getElementById("blurriness").value), mode, secondMode);
    }
    if (filterMode == MODE.POSTERIZE) {
        posterizeFilter(this, parseInt(document.getElementById("posterize-depth").value));
    }
}

/**
 * Adjusts the pixel's bit depth according to the given bit depth. Also applies the dithehring algorithm if provided.
 * @param {number} depth 
 * @param {string} ditherAlgo
 */
ImageData.prototype.fixBit = function (depth, ditherAlgo) {
    var mod = 256 / Math.pow(2, depth - 1);
    if (ditherAlgo == "none") {
        for (var i = 0; i < this.data.length; i++) {
            if (i % 4 != 3)
                this.data[i] = Math.round(this.data[i] / mod) * mod;
        }
    }
    if (ditherAlgo == "floyd-steinberg") {
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var index = vectorToIndex(i, j, this.width);
                for (var k = 0; k < 3; k++) {
                    var oldvalue = this.data[index + k];
                    var newvalue = Math.round(oldvalue / mod) * mod;
                    this.data[index + k] = newvalue;
                    var error = oldvalue - newvalue;
                    for (var m = 7; m > 0; m -= 2) {
                        var neighbor = vectorToIndex(i + (m == 3 ? -1 : m == 5 ? 0 : 1), j + (m == 7 ? 0 : 1), this.width);
                        this.data[neighbor + k] += Math.trunc(error * m / 16);
                    }
                }
            }
        }
    }
}

/**
 * Sets the given pixel to the given ImageData.data's specified pixel.
 * @param {Uint8ClampedArray} look 
 * @param {number} editIndex 
 * @param {number} targetIndex 
 */
ImageData.prototype.setPixel = function (look, editIndex, targetIndex) {
    for (var i = 0; i < 4; i++) {
        this.data[editIndex + i] = look[targetIndex + i];
    }
}

/**
 * Applies the flip filter to the given ImageData using the given axis.
 * @param {ImageData} orig 
 * @param {string} axis 
 */
function flipFilter(orig, axis) {
    var backup = Uint8ClampedArray.from(orig.data);
    for (var i = 0; i < orig.width; i++) {
        for (var j = 0; j < orig.height; j++) {
            var ii = axis == "vertical" || axis == "both" ? orig.width - i : i;
            var jj = axis == "horizontal" || axis == "both" ? orig.height - j : j;
            orig.setPixel(backup, vectorToIndex(i, j, orig.width), vectorToIndex(ii, jj, orig.width));
        }
    }
}

/**
 * Applies the grayscale filter to the given ImageData with the given mode.
 * @param {ImageData} orig 
 * @param {string} mode 
 * @param {string} secondMode 
 */
function grayscaleFilter(orig, mode, secondMode) {
    for (var i = 0; i < orig.data.length; i += 4) {
        var gray = 0;
        if (mode == "desaturation")
            gray = Math.floor((Math.max(orig.data[i], orig.data[i + 1], orig.data[i + 2]) + Math.min(orig.data[i], orig.data[i + 1], orig.data[i + 2])) / 2);
        if (mode == "average")
            gray = Math.floor((orig.data[i] + orig.data[i + 1] + orig.data[i + 2]) / 3);
        if (mode == "luminance")
            gray = Math.floor(0.21 * orig.data[i] + 0.72 * orig.data[i + 1] + 0.07 * orig.data[i + 2]);
        if (mode == "decomposition")
            if (secondMode == "max")
                gray = Math.max(orig.data[i], orig.data[i + 1], orig.data[i + 2]);
            else if (secondMode == "min")
                gray = Math.min(orig.data[i], orig.data[i + 1], orig.data[i + 2]);
        if (mode == "single-color")
            if (secondMode == "red")
                gray = orig.data[i];
            else if (secondMode == "green")
                gray = orig.data[i + 1];
            else if (secondMode == "blue")
                gray = orig.data[i + 2];
        orig.data[i] = orig.data[i + 1] = orig.data[i + 2] = gray;
    }
}

/**
 * Applies the monochrome filter to the given ImageData with the given mode.
 * @param {ImageData} orig 
 * @param {string} mode 
 */
function monochromeFilter(orig, mode) {
    for (var i = 0; i < orig.data.length; i += 4) {
        if (mode != "red")
            orig.data[i] = 0;
        if (mode != "green")
            orig.data[i + 1] = 0;
        if (mode != "blue")
            orig.data[i + 2] = 0;
    }
}

/**
 * Applies the dichrome filter to the given ImageData with the given mode.
 * @param {ImageData} orig 
 * @param {string} mode 
 */
function dichromeFilter(orig, mode) {
    for (var i = 0; i < orig.data.length; i += 4) {
        if (mode == "red")
            orig.data[i] = 0;
        if (mode == "green")
            orig.data[i + 1] = 0;
        if (mode == "blue")
            orig.data[i + 2] = 0;
    }
}

/**
 * Applies the glass filter to the given ImageData using the given distance value.
 * @param {ImageData} orig 
 * @param {number} dist 
 */
function glassFilter(orig, dist) {
    var backup = Uint8ClampedArray.from(orig.data);
    for (var i = 0; i < orig.width; i++) {
        for (var j = 0; j < orig.height; j++) {
            var ii = random(i - dist, i + dist);
            var jj = random(j - dist, j + dist);
            if (inRectangle(ii, jj, orig.width, orig.height))
                orig.setPixel(backup, vectorToIndex(i, j, orig.width), vectorToIndex(ii, jj, orig.width));
        }
    }
}

/**
 * Applies the blur filter to the given ImageData using the given distance value.
 * @param {ImageData} orig 
 * @param {number} dist 
 * @param {string} mode 
 * @param {string} secondMode 
 */
function blurFilter(orig, dist, mode, secondMode) {
    if (mode == "motion")
        motionBlur(orig, dist, secondMode);
    if (mode == "box")
        boxBlur(orig, dist);
    if (mode == "tent")
        tentBlur(orig, dist);
}

/**
 * Applies the motion blur filter to the given ImageData using the given distance value and mode.
 * @param {ImageData} orig 
 * @param {number} dist 
 * @param {string} mode 
 */
function motionBlur(orig, dist, mode) {
    var backup = Uint8ClampedArray.from(orig.data);
    var isVert = mode == "vertical";
    for (var i = 0; i < (isVert ? orig.width : orig.height); ++i) {
        var accum = [0, 0, 0, 0];
        var count = 0;
        for (var j = 0; j < (isVert ? orig.height : orig.width); ++j) {
            if (count == 0) {
                for (var p = 0; p <= dist; ++p) {
                    var neighbor = vectorToIndex(isVert ? i : j + p, isVert ? j + p : i, orig.width);
                    for (var k = 0; k < 4; ++k)
                        accum[k] += backup[neighbor + k];
                    ++count;
                }
            } else {
                if (inRectangle(isVert ? i : j - dist, isVert ? j - dist : i, orig.width, orig.height)) {
                    var neighbor = vectorToIndex(isVert ? i : j - dist, isVert ? j - dist : i, orig.width);
                    for (var k = 0; k < 4; ++k)
                        accum[k] -= backup[neighbor + k];
                    --count;
                }
                if (inRectangle(isVert ? i : j + dist, isVert ? j + dist : i, orig.width, orig.height)) {
                    var neighbor = vectorToIndex(isVert ? i : j + dist, isVert ? j + dist : i, orig.width);
                    for (var k = 0; k < 4; ++k)
                        accum[k] += backup[neighbor + k];
                    ++count;
                }
            }
            var current = [];
            for (var k = 0; k < 4; ++k) {
                current.push(Math.floor(accum[k] / count));
            }
            orig.setPixel(current, vectorToIndex(isVert ? i : j, isVert ? j : i, orig.width), 0);
        }
    }
}

/**
 * Applies the box blur to the given ImageData using the given distance value.
 * @param {ImageData} orig 
 * @param {number} dist 
 */
function boxBlur(orig, dist) {
    motionBlur(orig, dist, "vertical");
    motionBlur(orig, dist, "horizontal");
}

/**
 * Applies the tent blur to the given ImageData using the given distance value.
 * @param {ImageData} orig 
 * @param {number} dist 
 */
function tentBlur(orig, dist) {
    boxBlur(orig, dist);
    boxBlur(orig, dist);
}

/**
 * Applies the posterize filter to the given ImageData using the given mod value.
 * @param {ImageData} orig 
 * @param {number} mod 
 */
function posterizeFilter(orig, mod) {
    for (var i = 0; i < orig.data.length; i++) {
        if (i % 4 != 3)
            orig.data[i] = Math.trunc(orig.data[i] / mod) * mod;
    }
}

/**
 * Returns whether the given point is in the rectangle.
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 */
function inRectangle(x, y, width, height) {
    return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Returns a random integer in the given range.
 * @param {number} lo 
 * @param {number} hi 
 */
function random(lo, hi) {
    return lo + Math.trunc(Math.random() * (hi - lo));
}

/**
 * Returns the corresponding index value of the given point in the flattened array using its width.
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 */
function vectorToIndex(x, y, width) {
    return (x + y * width) * 4;
}