"use strict";
/**
 * @fileoverview Cloud Function to handle team member invitations.
 */
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
exports.inviteTeamMember = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger = require("firebase-functions/logger");
var db = admin.firestore();
var auth = admin.auth();
exports.inviteTeamMember = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, email, role, planId, inviterUid, inviterProfileRef, inviterProfileSnap, inviterRole, userRecord, userProfileRef, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                // Ensure the user is authenticated before proceeding.
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
                }
                _a = request.data, name = _a.name, email = _a.email, role = _a.role, planId = _a.planId;
                inviterUid = request.auth.uid;
                inviterProfileRef = db.collection("users").doc(inviterUid);
                return [4 /*yield*/, inviterProfileRef.get()];
            case 1:
                inviterProfileSnap = _c.sent();
                inviterRole = (_b = inviterProfileSnap.data()) === null || _b === void 0 ? void 0 : _b.role;
                if (!inviterProfileSnap.exists || !['admin', 'superAdmin'].includes(inviterRole)) {
                    throw new https_1.HttpsError('permission-denied', 'No tienes permiso para invitar a nuevos miembros.');
                }
                // Input validation
                if (!name || !email || !role) {
                    throw new https_1.HttpsError("invalid-argument", "Faltan los datos de nombre, email o rol.");
                }
                logger.info("Iniciando invitaci\u00F3n para ".concat(email, " por ").concat(request.auth.token.email, " (UID: ").concat(inviterUid, ")"));
                _c.label = 2;
            case 2:
                _c.trys.push([2, 5, , 6]);
                return [4 /*yield*/, auth.createUser({
                        email: email,
                        emailVerified: false,
                        displayName: name,
                        disabled: false,
                    })];
            case 3:
                userRecord = _c.sent();
                logger.info("Usuario de Auth creado: ".concat(userRecord.uid));
                userProfileRef = db.collection("users").doc(userRecord.uid);
                return [4 /*yield*/, userProfileRef.set({
                        name: name,
                        email: email,
                        role: role,
                        status: 'pending', // User is pending until they log in for the first time
                        planId: planId || 'pro', // Use the passed plan or default to 'pro'
                        invitedBy: inviterUid, // Link to the inviting admin
                        createdAt: new Date(),
                        isActive: true, // Ensure the user is active by default
                    })];
            case 4:
                _c.sent();
                logger.info("Perfil de Firestore creado para ".concat(userRecord.uid, " con invitedBy: ").concat(inviterUid));
                logger.info("Invitaci\u00F3n para ".concat(email, " procesada exitosamente."));
                return [2 /*return*/, { success: true, message: "Invitaci\u00F3n enviada a ".concat(email, ".") }];
            case 5:
                error_1 = _c.sent();
                logger.error("Error al invitar miembro:", error_1);
                if (error_1.code === 'auth/email-already-exists') {
                    throw new https_1.HttpsError('already-exists', 'Este correo electrónico ya está en uso.');
                }
                throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al procesar la invitación.");
            case 6: return [2 /*return*/];
        }
    });
}); });
