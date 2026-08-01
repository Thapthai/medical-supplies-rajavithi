import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ?? dto.name;
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Category with this slug already exists');
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug,
        image: dto.image,
        is_active: dto.is_active ?? true,
      },
    });
    return { success: true, data: category, message: 'Category created successfully' };
  }

  async findAll(params: { page?: number; limit?: number; parentId?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({ where: {}, skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.category.count({ where: {} }),
    ]);
    return { success: true, data: categories, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!category) throw new NotFoundException('Category not found');
    return { success: true, data: category };
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Category not found');
    return { success: true, data: category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundException('Category not found');
    const slug = dto.name && !dto.slug ? dto.name : dto.slug;
    if (slug && slug !== existing.slug) {
      const slugExists = await this.prisma.category.findFirst({ where: { slug, id: { not: parseInt(id) } } });
      if (slugExists) throw new BadRequestException('Category with this slug already exists');
    }
    const updateData: any = { ...dto };
    if (slug) updateData.slug = slug;
    const category = await this.prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    return { success: true, data: category, message: 'Category updated successfully' };
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id: parseInt(id) } });
    return { success: true, message: 'Category deleted successfully' };
  }

  async getCategoryTree() {
    const categories = await this.prisma.category.findMany({ where: {}, orderBy: { created_at: 'desc' } });
    return { success: true, data: categories };
  }

  async getChildren(_parentId: string) {
    const children = await this.prisma.category.findMany({ orderBy: { created_at: 'desc' } });
    return { success: true, data: children };
  }
}
