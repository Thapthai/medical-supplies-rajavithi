import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoriesApi } from '@/lib/api';
import { categorySchema, type CategoryFormData } from '@/lib/validations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Tag, Edit } from 'lucide-react';
import type { Category } from '@/types/item';

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

export default function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      slug: '',
      is_active: true,
    },
  });

  // Load category data when dialog opens
  useEffect(() => {
    if (open && category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        slug: category.slug || '',
        is_active: category.is_active ?? true,
      });
    }
  }, [open, category, form]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Auto-generate slug from name (only if slug is empty)
  const name = form.watch('name');
  const slug = form.watch('slug');
  
  useEffect(() => {
    // Only auto-generate slug if it's empty
    // This prevents overwriting user's manual slug changes
    if (name && (!slug || slug.trim() === '')) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      form.setValue('slug', generatedSlug, { shouldValidate: false });
    }
  }, [name, slug, form]);

  const onSubmit = async (data: CategoryFormData) => {
    if (!category) return;

    try {
      setLoading(true);
      const response = await categoriesApi.update(category.id, {
        name: data.name,
        description: data.description || undefined,
        slug: data.slug || undefined,
        is_active: data.is_active,
      });

      if (response.success) {
        toast.success('แก้ไขหมวดหมู่เรียบร้อยแล้ว');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขหมวดหมู่ได้');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่');
    } finally {
      setLoading(false);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>แก้ไขหมวดหมู่</span>
          </DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลหมวดหมู่: {category.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อหมวดหมู่ *</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น อุปกรณ์การแพทย์" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น medical-equipment" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">จะสร้างอัตโนมัติจากชื่อหมวดหมู่</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำอธิบาย</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="คำอธิบายเกี่ยวกับหมวดหมู่นี้..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>สถานะ</FormLabel>
                    <p className="text-xs text-gray-500">เปิดใช้งานหมวดหมู่นี้</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

