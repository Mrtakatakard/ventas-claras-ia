import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { db } from '../config/firebase';
import { productService } from '../services/productService';
import { createInvoice } from '../services/invoiceService';
import { ClientRepository } from '../repositories/clientRepository';
import { productRepository } from '../repositories/productRepository';
import * as logger from 'firebase-functions/logger';

// Initialize Gemini
// TODO: Move API Key to secret manager
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

const MODEL_NAME = "gemini-2.0-flash-exp";

const tools = [
    {
        functionDeclarations: [
            {
                name: "searchProducts",
                description: "Search for products in the inventory by name to check availability and price.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        term: {
                            type: SchemaType.STRING,
                            description: "The product name or keyword to search for."
                        }
                    },
                    required: ["term"]
                }
            },
            {
                name: "createDraftOrder",
                description: "Create a pending invoice (order) for the client.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        items: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    productId: { type: SchemaType.STRING },
                                    quantity: { type: SchemaType.NUMBER }
                                },
                                required: ["productId", "quantity"]
                            }
                        }
                    },
                    required: ["items"]
                }
            }
        ]
    }
];

export const conversationAgent = {
    async handleMessage(userPhone: string, messageBody: string): Promise<string> {
        const chatId = `wa_${userPhone}`;
        const chatRef = db.collection('conversations').doc(chatId);

        // 1. Get History
        const chatDoc = await chatRef.get();
        let history = chatDoc.exists ? chatDoc.data()?.history || [] : [];

        // 2. Setup Model with Tools
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            tools: tools as any, // Cast to any to avoid strict typing issues with specific SDK versions
            systemInstruction: `
                You are 'Clara', an intelligent sales assistant for 'Ventas Claras'.
                Your goal is to help clients place orders via WhatsApp.
                
                Style:
                - Friendly, helpful, and concise (WhatsApp style).
                - Use Dominican Spanish (neutral but warm).
                - Use emojis.
                
                Process:
                1. If user asks for products, SEARCH usage the 'searchProducts' tool.
                2. Confirm details (which specific product, quantity).
                3. Total the amount (you can calculate based on price found).
                4. Ask for confirmation.
                5. Use 'createDraftOrder' to finalize.
                
                Context:
                - You are talking to a client with phone: ${userPhone}.
            `
        });

        // 3. Start Chat Session
        const chat = model.startChat({
            history: history.map((h: any) => ({
                role: h.role,
                parts: [{ text: h.text }] // Simplified for MVP
            }))
        });

        try {
            // 4. Send Message using Function Calling
            const result = await chat.sendMessage(messageBody);
            const response = result.response;

            let responseText = response.text();

            // Handle Function Calls
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                // For MVP, handling first call. In production, handle loop.
                const call = functionCalls[0];
                const { name, args } = call;

                let functionResponse: any = { error: "Unknown function" };

                if (name === "searchProducts") {
                    const term = (args as any).term;
                    logger.info(`Agent calling searchProducts: ${term}`);
                    // Mock User ID for receiving user. In production, look up business owner of this phone line
                    const userId = "DEFAULT_USER_ID"; // TODO: multitenancy lookup
                    const products = await productService.searchProducts(term, userId);

                    functionResponse = {
                        products: products.map(p => ({
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            stock: p.stock
                        }))
                    };
                } else if (name === "createDraftOrder") {
                    const items = (args as any).items;
                    logger.info(`Agent calling createDraftOrder with ${items.length} items`);

                    const userId = "DEFAULT_USER_ID"; // TODO: Implement real tenant lookup based on phone number entry point

                    // 1. Identify Client
                    let client = await ClientRepository.findByPhone(userPhone, userId);
                    if (!client) {
                        // Create a temporary/guest client logic could go here. 
                        // For MVP, we error out or use a generic client if exists.
                        functionResponse = { error: "Client not found. Please register first." };
                    } else {
                        // 2. Build Invoice Items with Prices
                        const invoiceItems = [];
                        let subtotal = 0;
                        let itbisTotal = 0;

                        for (const item of items) {
                            const product = await productRepository.get(item.productId);
                            if (!product) continue;

                            const quantity = item.quantity;
                            const price = product.price || 0; // Using base price
                            const total = price * quantity;

                            // Simple tax calc (assuming included or 18% if configured - keeping simple for MVP)
                            const itbis = 0;

                            invoiceItems.push({
                                productId: product.id,
                                productName: product.name,
                                quantity: quantity,
                                unitPrice: price,
                                itbis: itbis,
                                total: total,
                                finalPrice: total // Assuming no discounts yet
                            });
                            subtotal += total;
                            itbisTotal += itbis;
                        }

                        const total = subtotal + itbisTotal;

                        try {
                            // 3. Create Invoice
                            const invoiceId = await createInvoice({
                                items: invoiceItems,
                                clientName: client.name,
                                clientEmail: client.email,
                                clientId: client.id,
                                issueDate: new Date().toISOString().split('T')[0],
                                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
                                total: total,
                                subtotal: subtotal,
                                itbis: itbisTotal,
                                currency: 'DOP', // Default
                                ncfType: 'Simples', // Default
                            }, userId);

                            functionResponse = { success: true, orderId: invoiceId, total: total };
                            responseText = `¡Listo! He creado tu pedido #${invoiceId} por un total de RD$${total.toFixed(2)}. 🎉 ¿Te paso el link de pago?`;
                        } catch (e: any) {
                            logger.error("Failed to create invoice", e);
                            functionResponse = { error: e.message };
                        }
                    }
                }

                // Send function response back to model
                const result2 = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: name,
                            response: functionResponse
                        }
                    }
                ]);
                responseText = result2.response.text();
            }

            // 5. Save History
            // Convert Generative AI history to simple store
            // For MVP, just pushing new exchanges
            const newHistory = [
                ...history,
                { role: 'user', text: messageBody },
                { role: 'model', text: responseText }
            ].slice(-20); // Keep last 20

            await chatRef.set({
                history: newHistory,
                updatedAt: new Date(),
                userPhone
            }, { merge: true });

            return responseText;

        } catch (error) {
            logger.error("AI Agent Error", error);
            return "Lo siento, tuve un pequeño problema técnico. 😵‍💫 ¿Me lo repites?";
        }
    }
};
