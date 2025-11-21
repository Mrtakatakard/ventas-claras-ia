"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
var productRepository_1 = require("../repositories/productRepository");
var categoryRepository_1 = require("../repositories/categoryRepository");
var functions = require("firebase-functions");
var index_1 = require("../index");
exports.productService = {
    createProduct: function (data, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingProducts, id, newProduct;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, productRepository_1.productRepository.findByCode(data.code, userId)];
                    case 1:
                        existingProducts = _a.sent();
                        if (existingProducts.length > 0) {
                            throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
                        }
                        id = index_1.db.collection("products").doc().id;
                        newProduct = __assign(__assign({}, data), { id: id, userId: userId, createdAt: new Date(), isActive: true });
                        return [4 /*yield*/, productRepository_1.productRepository.create(newProduct)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, id];
                }
            });
        });
    },
    updateProduct: function (id, data, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var product, existingProducts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, productRepository_1.productRepository.get(id)];
                    case 1:
                        product = _a.sent();
                        if (!product || product.userId !== userId) {
                            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
                        }
                        if (!(data.code && data.code !== product.code)) return [3 /*break*/, 3];
                        return [4 /*yield*/, productRepository_1.productRepository.findByCode(data.code, userId)];
                    case 2:
                        existingProducts = _a.sent();
                        if (existingProducts.length > 0) {
                            throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
                        }
                        _a.label = 3;
                    case 3: return [4 /*yield*/, productRepository_1.productRepository.update(id, data)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    deleteProduct: function (id, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var product;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, productRepository_1.productRepository.get(id)];
                    case 1:
                        product = _a.sent();
                        if (!product || product.userId !== userId) {
                            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
                        }
                        return [4 /*yield*/, productRepository_1.productRepository.delete(id)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    checkProductCodeExists: function (code, userId, excludeId) {
        return __awaiter(this, void 0, void 0, function () {
            var products;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, productRepository_1.productRepository.findByCode(code, userId)];
                    case 1:
                        products = _a.sent();
                        if (excludeId) {
                            return [2 /*return*/, products.some(function (p) { return p.id !== excludeId; })];
                        }
                        return [2 /*return*/, products.length > 0];
                }
            });
        });
    },
    batchCreateProducts: function (products, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var batch, existingCategories, existingCategoryNames, newCategoryNames, _i, products_1, productData, upperCat, catId, newCategory, catRef, prodId, newProduct, prodRef;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batch = index_1.db.batch();
                        return [4 /*yield*/, categoryRepository_1.categoryRepository.getAll(userId)];
                    case 1:
                        existingCategories = _a.sent();
                        existingCategoryNames = new Set(existingCategories.map(function (c) { return c.name.toUpperCase(); }));
                        newCategoryNames = new Set();
                        for (_i = 0, products_1 = products; _i < products_1.length; _i++) {
                            productData = products_1[_i];
                            // Handle Category
                            if (productData.category) {
                                upperCat = productData.category.toUpperCase();
                                if (!existingCategoryNames.has(upperCat) && !newCategoryNames.has(upperCat)) {
                                    catId = index_1.db.collection("categories").doc().id;
                                    newCategory = {
                                        id: catId,
                                        name: productData.category,
                                        description: "Categoría creada automáticamente desde importación.",
                                        userId: userId,
                                        createdAt: new Date(),
                                        isActive: true
                                    };
                                    catRef = index_1.db.collection("categories").doc(catId);
                                    batch.set(catRef, newCategory);
                                    newCategoryNames.add(upperCat);
                                }
                            }
                            prodId = index_1.db.collection("products").doc().id;
                            newProduct = __assign(__assign({}, productData), { id: prodId, userId: userId, createdAt: new Date(), isActive: true });
                            prodRef = index_1.db.collection("products").doc(prodId);
                            batch.set(prodRef, newProduct);
                        }
                        return [4 /*yield*/, batch.commit()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
};
