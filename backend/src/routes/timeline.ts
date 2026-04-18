import express, { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as timelineService from '../services/timelineService';
import { CreateTimelineEventInput, UpdateTimelineEventInput } from '../types/timeline';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 创建时间轴事件
router.post('/events', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data: CreateTimelineEventInput = req.body;
    
    const event = await timelineService.createTimelineEvent({
      ...data,
      timestamp: new Date(data.timestamp)
    });
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

// 获取实体的时间轴事件
router.get('/entities/:entityId/events', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const events = await timelineService.getTimelineEventsByEntity(entityId);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

// 获取世界的时间轴事件
router.get('/worlds/:worldId/events', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { worldId } = req.params;
    const events = await timelineService.getTimelineEventsByWorld(worldId);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

// 更新时间轴事件
router.put('/events/:eventId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const data: UpdateTimelineEventInput = req.body;
    
    const event = await timelineService.updateTimelineEvent(eventId, {
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : undefined
    });
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

// 删除时间轴事件
router.delete('/events/:eventId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const event = await timelineService.deleteTimelineEvent(eventId);
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

// 获取单个时间轴事件
router.get('/events/:eventId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const event = await timelineService.getTimelineEventById(eventId);
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

export default router;