// 2. Third-party
import { Request, Response, NextFunction } from 'express';

// 3. Internal
import { bhkTypeService } from '@/config/container';
import { BhkTypeListResponseSchema } from '@/dto/bhk-type.dto';

export async function listBhkTypes(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bhkTypes = await bhkTypeService.listAll();
    res.status(200).json(
      BhkTypeListResponseSchema.parse({
        data: bhkTypes.map((bhkType) => ({
          id: bhkType.id,
          name: bhkType.name,
          createdAt: bhkType.createdAt.toISOString(),
        })),
      }),
    );
  } catch (err) {
    next(err);
  }
}
