// 3. Internal
import { BhkType } from '@/entities/BhkType.entity';
import { BhkTypeRepository } from '@/repositories/bhk-type.repository';

export class BhkTypeService {
  constructor(private readonly bhkTypeRepository: BhkTypeRepository) {}

  async listAll(): Promise<BhkType[]> {
    return this.bhkTypeRepository.findAll();
  }
}
