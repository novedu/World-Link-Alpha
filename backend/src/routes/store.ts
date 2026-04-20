import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as worldService from '../services/worldService';
import * as bookService from '../services/bookService';
import * as entityService from '../services/entityService';
import * as captureService from '../services/captureService';
import type { World, Book, Entity, Capture } from '@prisma/client';

interface StoreResults {
  worlds?: World[];
  books?: Book[];
  entities?: Entity[];
  capturedList?: Capture[];
}

interface ImportResults {
  imported: {
    worlds: number;
    books: number;
    entities: number;
    capturedList: number;
  };
}

interface PatchResults {
  updated: {
    worlds: number;
    books: number;
    entities: number;
    capturedList: number;
  };
}

const router = Router();

// 统一存储接口 - 支持世界、书籍、实体、捕获记录的读写
router.post('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { worlds, books, entities, capturedList } = req.body;
    const results: StoreResults = {};

    // 处理世界数据
    if (worlds) {
      const worldResults = [];
      for (const world of worlds) {
        if (world.id) {
          // 更新世界
          const updatedWorld = await worldService.updateWorld(
            world.id,
            req.user!.userId,
            {
              name: world.name,
              description: world.description
            }
          );
          worldResults.push(updatedWorld);
        } else {
          // 创建世界
          const newWorld = await worldService.createWorld({
            userId: req.user!.userId,
            name: world.name,
            description: world.description
          });
          worldResults.push(newWorld);
        }
      }
      results.worlds = worldResults;
    }

    // 处理书籍数据
    if (books) {
      const bookResults = [];
      for (const book of books) {
        if (book.id) {
          // 更新书籍
          const updatedBook = await bookService.updateBook(
            book.id,
            req.user!.userId,
            {
              title: book.title,
              description: book.description,
              status: book.status
            }
          );
          bookResults.push(updatedBook);
        } else {
          // 创建书籍
          const newBook = await bookService.createBook(
            req.user!.userId,
            {
              worldId: book.worldId,
              title: book.title,
              description: book.description
            }
          );
          bookResults.push(newBook);
        }
      }
      results.books = bookResults;
    }

    // 处理实体数据
    if (entities) {
      const entityResults = [];
      for (const entity of entities) {
        if (entity.id) {
          // 更新实体
          const updatedEntity = await entityService.updateEntity(
            entity.id,
            req.user!.userId,
            {
              name: entity.name,
              type: entity.type,
              summary: entity.summary,
              tags: entity.tags,
              sourceUrl: entity.sourceUrl,
              sourceTitle: entity.sourceTitle
            }
          );
          entityResults.push(updatedEntity);
        } else {
          // 创建实体
          const newEntity = await entityService.createEntity(
            req.user!.userId,
            {
              worldId: entity.worldId,
              name: entity.name,
              type: entity.type,
              summary: entity.summary,
              tags: entity.tags,
              sourceUrl: entity.sourceUrl,
              sourceTitle: entity.sourceTitle
            }
          );
          entityResults.push(newEntity);
        }
      }
      results.entities = entityResults;
    }

    // 处理捕获记录数据
    if (capturedList) {
      const captureResults = [];
      for (const capture of capturedList) {
        if (capture.id) {
          // 更新捕获记录
          const updatedCapture = await captureService.updateCapture(
            capture.id,
            req.user!.userId,
            {
              status: capture.status,
              entityId: capture.entityId
            }
          );
          captureResults.push(updatedCapture);
        } else {
          // 创建捕获记录
          const newCapture = await captureService.createCapture({
            userId: req.user!.userId,
            text: capture.text,
            sourceUrl: capture.sourceUrl,
            sourceTitle: capture.sourceTitle
          });
          captureResults.push(newCapture);
        }
      }
      results.capturedList = captureResults;
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// 统一读取接口 - 获取所有数据
router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [worlds, captures] = await Promise.all([
      worldService.getWorldsByUser(req.user!.userId),
      captureService.getCapturesByUser(req.user!.userId)
    ]);

    let allBooks: Book[] = [];
    let allEntities: Entity[] = [];

    // 获取所有世界的书籍和实体
    if (worlds.length > 0) {
      for (const world of worlds) {
        const [books, entities] = await Promise.all([
          bookService.getBooksByWorld(world.id, req.user!.userId),
          entityService.getEntitiesByWorld(world.id, req.user!.userId)
        ]);
        allBooks = [...allBooks, ...books];
        allEntities = [...allEntities, ...entities];
      }
    }

    res.json({
      success: true,
      data: {
        worlds,
        books: allBooks,
        entities: allEntities,
        capturedList: captures
      }
    });
  } catch (error) {
    next(error);
  }
});

// 批量导入接口 - 用于本地数据迁移到云端
router.post('/import', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { store } = req.body;

    if (!store || typeof store !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'store 数据格式不正确',
          details: {},
          fieldErrors: {}
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { worlds = [], books = [], entities = [], capturedList = [] } = store;
    const results: ImportResults = {
      imported: {
        worlds: 0,
        books: 0,
        entities: 0,
        capturedList: 0
      }
    };

    for (const world of worlds) {
      try {
        if (world.id) {
          await worldService.updateWorld(world.id, req.user!.userId, {
            name: world.name,
            description: world.description
          });
        } else {
          await worldService.createWorld({
            userId: req.user!.userId,
            name: world.name,
            description: world.description
          });
        }
        results.imported.worlds++;
      } catch (error: unknown) {
        console.warn('[Store Import] world import failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const book of books) {
      try {
        if (book.id) {
          await bookService.updateBook(book.id, req.user!.userId, {
            title: book.title,
            description: book.description,
            status: book.status
          });
        } else {
          await bookService.createBook(req.user!.userId, {
            worldId: book.worldId,
            title: book.title,
            description: book.description
          });
        }
        results.imported.books++;
      } catch (error: unknown) {
        console.warn('[Store Import] book import failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const entity of entities) {
      try {
        if (entity.id) {
          await entityService.updateEntity(entity.id, req.user!.userId, {
            name: entity.name,
            type: entity.type,
            summary: entity.summary,
            tags: entity.tags,
            sourceUrl: entity.sourceUrl,
            sourceTitle: entity.sourceTitle
          });
        } else {
          await entityService.createEntity(req.user!.userId, {
            worldId: entity.worldId,
            name: entity.name,
            type: entity.type,
            summary: entity.summary,
            tags: entity.tags,
            sourceUrl: entity.sourceUrl,
            sourceTitle: entity.sourceTitle
          });
        }
        results.imported.entities++;
      } catch (error: unknown) {
        console.warn('[Store Import] entity import failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const capture of capturedList) {
      try {
        if (capture.id) {
          await captureService.updateCapture(capture.id, req.user!.userId, {
            status: capture.status,
            entityId: capture.entityId
          });
        } else {
          await captureService.createCapture({
            userId: req.user!.userId,
            text: capture.text,
            sourceUrl: capture.sourceUrl,
            sourceTitle: capture.sourceTitle
          });
        }
        results.imported.capturedList++;
      } catch (error: unknown) {
        console.warn('[Store Import] capture import failed:', error instanceof Error ? error.message : String(error));
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// 批量更新接口 - 用于迁移时的回退更新
router.patch('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { partial } = req.body;

    if (!partial || typeof partial !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'partial 数据格式不正确',
          details: {},
          fieldErrors: {}
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { worlds = [], books = [], entities = [], capturedList = [] } = partial;
    const results: PatchResults = {
      updated: {
        worlds: 0,
        books: 0,
        entities: 0,
        capturedList: 0
      }
    };

    for (const world of worlds) {
      try {
        if (world.id) {
          await worldService.updateWorld(world.id, req.user!.userId, {
            name: world.name,
            description: world.description
          });
          results.updated.worlds++;
        }
      } catch (error: unknown) {
        console.warn('[Store Patch] world update failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const book of books) {
      try {
        if (book.id) {
          await bookService.updateBook(book.id, req.user!.userId, {
            title: book.title,
            description: book.description,
            status: book.status
          });
          results.updated.books++;
        }
      } catch (error: unknown) {
        console.warn('[Store Patch] book update failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const entity of entities) {
      try {
        if (entity.id) {
          await entityService.updateEntity(entity.id, req.user!.userId, {
            name: entity.name,
            type: entity.type,
            summary: entity.summary,
            tags: entity.tags,
            sourceUrl: entity.sourceUrl,
            sourceTitle: entity.sourceTitle
          });
          results.updated.entities++;
        }
      } catch (error: unknown) {
        console.warn('[Store Patch] entity update failed:', error instanceof Error ? error.message : String(error));
      }
    }

    for (const capture of capturedList) {
      try {
        if (capture.id) {
          await captureService.updateCapture(capture.id, req.user!.userId, {
            status: capture.status,
            entityId: capture.entityId
          });
          results.updated.capturedList++;
        }
      } catch (error: unknown) {
        console.warn('[Store Patch] capture update failed:', error instanceof Error ? error.message : String(error));
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

export default router;
