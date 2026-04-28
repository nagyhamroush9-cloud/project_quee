import { Router } from "express";
import { pool } from "../../config/db.js";
import { MessageRepo } from "../../repositories/messageRepo.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { emitNewMessage } from "../../realtime/emitters.js";
import { z } from "zod";

const sendMessageSchema = z.object({
    receiverId: z.number().int().positive(),
    content: z.string().min(1).max(1000)
});

const conversationSchema = z.object({
    otherUserId: z.number().int().positive()
});

export const messageRoutes = Router();

messageRoutes.get("/", requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const messages = await MessageRepo.listForUser(conn, {
            userId: req.user.id,
            limit: Number(req.query.limit) || 50,
            offset: Number(req.query.offset) || 0
        });
        res.json({ messages });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});

messageRoutes.get("/conversation/:otherUserId", requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const messages = await MessageRepo.listConversation(conn, {
            userId1: req.user.id,
            userId2: req.params.otherUserId,
            limit: Number(req.query.limit) || 50,
            offset: Number(req.query.offset) || 0
        });
        res.json({ messages });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});

messageRoutes.post("/", requireAuth, validateBody(sendMessageSchema), async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const message = await MessageRepo.create(conn, {
            senderId: req.user.id,
            receiverId: req.body.receiverId,
            content: req.body.content
        });

        // Get the full message with sender info for emitting
        const [messages] = await conn.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
              u.full_name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
            [message.id]
        );

        if (messages.length) {
            emitNewMessage(req.user.id, req.body.receiverId, messages[0]);
        }

        res.json({ message });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});

messageRoutes.post("/:messageId/read", requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await MessageRepo.markRead(conn, {
            userId: req.user.id,
            messageId: req.params.messageId
        });
        res.json({ success: true });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});

messageRoutes.get("/unread-count", requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const count = await MessageRepo.getUnreadCount(conn, { userId: req.user.id });
        res.json({ count });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});