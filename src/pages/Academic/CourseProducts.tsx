import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Library, Plus, X, Trash2, BookOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CourseProduct } from '../../types';

export function CourseProducts() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const courseProducts = useLiveQuery(() => db.courseProducts.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c]));
  const productMap = new Map(products?.map(p => [p.id, p]));

  const handleUnbind = async (id: string) => {
    if (confirm('هل أنت متأكد من فك ارتباط هذا الكتاب بالكورس؟')) {
      await db.courseProducts.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الكتب التعليمية للكورسات</h1>
          <p className="text-sm text-slate-500 mt-1">تحديد المذكرات والكتب المنهجية المربوطة بكل كورس دراسي</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          ربط كتاب بكورس
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {courseProducts?.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <Library className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد كتب مربوطة حالياً</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md">
              اضغط على "ربط كتاب بكورس" لربط مذكرات ومناهج السنتر بالكورسات المناسبة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courseProducts?.map(cp => {
              const course = courseMap.get(cp.courseId);
              const product = productMap.get(cp.productId);

              return (
                <div key={cp.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        cp.isMandatory ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700'
                      }`}>
                        {cp.isMandatory ? 'مذكرة إلزامية' : 'كتاب اختياري'}
                      </span>
                      <button 
                        onClick={() => handleUnbind(cp.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="فك الارتباط"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-start gap-2.5 mt-2">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{product?.name || 'كتاب غير معروف'}</h3>
                        <p className="text-xs text-blue-600 font-medium">{course?.name || 'كورس غير محدد'}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>سعر الكتاب:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{product?.salePrice || 0} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الكمية في المخزن:</span>
                        <span className={`font-semibold ${(product?.stockQty || 0) < 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {product?.stockQty || 0} نسخة
                        </span>
                      </div>
                      {cp.discountValue > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>خصم لطلاب الكورس:</span>
                          <span>{cp.discountValue} {cp.discountType === 'percentage' ? '%' : 'ج.م'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <BindBookModal 
          onClose={() => setIsModalOpen(false)}
          courses={courses || []}
          products={products || []}
        />
      )}
    </div>
  );
}

function BindBookModal({ 
  onClose, 
  courses, 
  products 
}: { 
  onClose: () => void; 
  courses: any[]; 
  products: any[]; 
}) {
  const [formData, setFormData] = useState({
    courseId: courses[0]?.id || '',
    productId: products[0]?.id || '',
    isMandatory: true,
    discountType: 'none' as 'none' | 'percentage' | 'fixed',
    discountValue: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.productId) return;

    const now = Date.now();
    const newCourseProduct: CourseProduct = {
      id: uuidv4(),
      courseId: formData.courseId,
      productId: formData.productId,
      isMandatory: formData.isMandatory,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.courseProducts.add(newCourseProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">ربط كتاب بكورس</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر الكورس *</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.courseId}
              onChange={e => setFormData({ ...formData, courseId: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر الكتاب / المذكرة *</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.productId}
              onChange={e => setFormData({ ...formData, productId: e.target.value })}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.salePrice} ج.م)</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox"
              id="isMandatory"
              checked={formData.isMandatory}
              onChange={e => setFormData({ ...formData, isMandatory: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="isMandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              مذكرة إجبارية مع الاشتراك
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الخصم للطلاب</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.discountType}
                onChange={e => setFormData({ ...formData, discountType: e.target.value as any })}
              >
                <option value="none">بدون خصم</option>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ج.م)</option>
              </select>
            </div>
            {formData.discountType !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">قيمة الخصم</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.discountValue}
                  onChange={e => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              تأكيد الربط
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
