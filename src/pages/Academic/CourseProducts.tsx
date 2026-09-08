import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  Library, Plus, X, Trash2, Edit2, BookOpen, Printer, Search, 
  Filter, CheckCircle, AlertTriangle, Users, DollarSign, FileText, Check 
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CourseProduct, Course, Product, Group, Enrollment, ProductSale, Student } from '../../types';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { useToast } from '../../context/ToastContext';

export function CourseProducts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CourseProduct | null>(null);
  const [selectedForReport, setSelectedForReport] = useState<CourseProduct | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [mandatoryFilter, setMandatoryFilter] = useState<'all' | 'mandatory' | 'optional'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  // Reactive queries with soft-delete exclusion
  const courseProducts = useLiveQuery(() => db.courseProducts.filter(cp => !cp.deleted_at).toArray(), []);
  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at).toArray(), []);
  const products = useLiveQuery(() => db.products.filter(p => !p.deleted_at).toArray(), []);
  const groups = useLiveQuery(() => db.groups.filter(g => !g.deleted_at).toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.filter(e => !e.deleted_at && e.status === 'active').toArray(), []);
  const sales = useLiveQuery(() => db.productSales.filter(s => !s.deleted_at).toArray(), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c]));
  const productMap = new Map(products?.map(p => [p.id, p]));

  // Soft delete unbinding
  const handleUnbind = async (id: string, productName?: string, courseName?: string) => {
    if (confirm(`هل أنت متأكد من فك ارتباط (${productName || 'الكتاب'}) بكورس (${courseName || 'المادة'})؟`)) {
      try {
        const now = Date.now();
        await db.courseProducts.update(id, {
          deleted_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success('تم فك ارتباط الكتاب بالكورس بنجاح');
      } catch (err) {
        toast.error('حدث خطأ أثناء فك الارتباط');
      }
    }
  };

  // Filtered links
  const filteredCourseProducts = courseProducts?.filter(cp => {
    if (selectedCourseFilter !== 'all' && cp.courseId !== selectedCourseFilter) return false;
    if (mandatoryFilter === 'mandatory' && !cp.isMandatory) return false;
    if (mandatoryFilter === 'optional' && cp.isMandatory) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const course = courseMap.get(cp.courseId);
      const product = productMap.get(cp.productId);
      const matchCourse = course?.name.toLowerCase().includes(term);
      const matchProduct = product?.name.toLowerCase().includes(term);
      if (!matchCourse && !matchProduct) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الكتب التعليمية والمذكرات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ربط مذكرات ومناهج السنتر بالكورسات الدراسية، إدارة الخصومات، وطباعة كشوفات استلام ومبيعات الطلاب
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingLink(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          ربط كتاب بكورس
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث باسم الكتاب أو الكورس..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <select
              value={selectedCourseFilter}
              onChange={e => setSelectedCourseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">جميع الكورسات ({courses?.length || 0})</option>
              {courses?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={mandatoryFilter}
              onChange={e => setMandatoryFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">كافة الأنواع (إلزامية واختيارية)</option>
              <option value="mandatory">المذكرات الإلزامية فقط</option>
              <option value="optional">الكتب والمراجع الاختيارية فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Linked Books Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {filteredCourseProducts?.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <Library className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              {searchTerm || selectedCourseFilter !== 'all' || mandatoryFilter !== 'all' 
                ? 'لا توجد كتب مطابقة لمعايير البحث والفلترة' 
                : 'لا توجد كتب مربوطة بكورسات حالياً'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">
              اضغط على "ربط كتاب بكورس" لربط مذكرات ومناهج السنتر بالكورسات المناسبة وتحديد نسب الخصم وإلزامية الاستلام.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourseProducts?.map(cp => {
              const course = courseMap.get(cp.courseId);
              const product = productMap.get(cp.productId);

              // Calculate buyer stats for this course-product
              const courseGroups = groups?.filter(g => g.courseId === cp.courseId) || [];
              const courseGroupIds = new Set(courseGroups.map(g => g.id));
              const courseEnrollments = enrollments?.filter(e => courseGroupIds.has(e.groupId)) || [];
              const enrolledStudentIds = new Set(courseEnrollments.map(e => e.studentId));
              const totalEnrolled = enrolledStudentIds.size;

              // Enrolled students who purchased this product
              const productSalesForCourse = sales?.filter(s => 
                s.productId === cp.productId && s.studentId && enrolledStudentIds.has(s.studentId)
              ) || [];
              const buyersCount = new Set(productSalesForCourse.map(s => s.studentId)).size;
              const fulfillmentRate = totalEnrolled > 0 ? Math.round((buyersCount / totalEnrolled) * 100) : 0;

              // Discount calculation
              const basePrice = product ? toMajorUnits(product.salePrice) : 0;
              let finalStudentPrice = basePrice;
              if (cp.discountType === 'percentage') {
                finalStudentPrice = Math.max(0, basePrice - (basePrice * (cp.discountValue / 100)));
              } else if (cp.discountType === 'fixed') {
                finalStudentPrice = Math.max(0, basePrice - toMajorUnits(cp.discountValue));
              }

              return (
                <div key={cp.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 transition-colors flex flex-col justify-between bg-white dark:bg-slate-900">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                        cp.isMandatory 
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {cp.isMandatory ? 'مذكرة إلزامية' : 'كتاب اختياري'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingLink(cp);
                            setIsModalOpen(true);
                          }}
                          className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="تعديل إعدادات الربط والخصم"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUnbind(cp.id, product?.name, course?.name)}
                          className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="فك الارتباط"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 mt-2">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{product?.name || 'كتاب غير معروف'}</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{course?.name || 'كورس غير محدد'}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>سعر البيع الأصلي:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{basePrice} ج.م</span>
                      </div>
                      
                      {cp.discountValue > 0 ? (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>سعر خاص لطلاب الكورس:</span>
                          <span className="font-bold text-sm">
                            {finalStudentPrice} ج.م
                            <span className="text-[10px] font-normal mr-1 text-slate-500 dark:text-slate-400">
                              ({cp.discountType === 'percentage' ? `خصم ${cp.discountValue}%` : `خصم ${toMajorUnits(cp.discountValue)} ج.م`})
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-slate-400 dark:text-slate-500">
                          <span>الخصم لطلاب الكورس:</span>
                          <span>بدون خصم خاص</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span>الرصيد في المخزن:</span>
                        <span className={`font-semibold flex items-center ${(product?.stockQty || 0) < 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {(product?.stockQty || 0) < 5 && <AlertTriangle className="w-3.5 h-3.5 ml-1 text-amber-500" />}
                          {product?.stockQty || 0} نسخة
                        </span>
                      </div>

                      {/* Buyer progress banner */}
                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between text-xs mb-1 font-medium">
                          <span className="text-slate-700 dark:text-slate-300">معدل استلام الطلاب:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {buyersCount} من {totalEnrolled} طالب ({fulfillmentRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              fulfillmentRate >= 80 ? 'bg-emerald-500' : fulfillmentRate >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, fulfillmentRate)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Buyers List Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedForReport(cp)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      طباعة كشف المشترين والمستلمين
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link / Edit Modal */}
      {isModalOpen && (
        <BindBookModal 
          link={editingLink}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLink(null);
          }}
          courses={courses || []}
          products={products || []}
        />
      )}

      {/* Print Buyers List Modal */}
      {selectedForReport && (
        <BuyersListModal
          courseProduct={selectedForReport}
          course={courseMap.get(selectedForReport.courseId)}
          product={productMap.get(selectedForReport.productId)}
          groups={groups || []}
          enrollments={enrollments || []}
          sales={sales || []}
          students={students || []}
          onClose={() => setSelectedForReport(null)}
        />
      )}
    </div>
  );
}

// Modal for linking a book to a course or editing link config
function BindBookModal({ 
  link,
  onClose, 
  courses, 
  products 
}: { 
  link?: CourseProduct | null;
  onClose: () => void; 
  courses: Course[]; 
  products: Product[]; 
}) {
  const toast = useToast();
  const isEdit = !!link;

  const [formData, setFormData] = useState({
    courseId: link?.courseId || courses[0]?.id || '',
    productId: link?.productId || products[0]?.id || '',
    isMandatory: link ? link.isMandatory : true,
    discountType: (link?.discountType || 'none') as 'none' | 'percentage' | 'fixed',
    discountValue: link 
      ? (link.discountType === 'fixed' ? toMajorUnits(link.discountValue).toString() : link.discountValue.toString()) 
      : '0'
  });

  const selectedProduct = products.find(p => p.id === formData.productId);
  const basePrice = selectedProduct ? toMajorUnits(selectedProduct.salePrice) : 0;
  const numDiscount = Number(formData.discountValue) || 0;
  let finalPrice = basePrice;
  if (formData.discountType === 'percentage') {
    finalPrice = Math.max(0, basePrice - (basePrice * (numDiscount / 100)));
  } else if (formData.discountType === 'fixed') {
    finalPrice = Math.max(0, basePrice - numDiscount);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.productId) {
      toast.error('يرجى اختيار الكورس والكتاب');
      return;
    }

    try {
      const now = Date.now();
      const calculatedDiscountValue = formData.discountType === 'fixed' 
        ? toMinorUnits(Number(formData.discountValue)) 
        : Number(formData.discountValue);

      if (isEdit) {
        await db.courseProducts.update(link.id, {
          isMandatory: formData.isMandatory,
          discountType: formData.discountType,
          discountValue: calculatedDiscountValue,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success('تم تحديث إعدادات ربط الكتاب بنجاح');
      } else {
        // Check if already linked
        const existing = await db.courseProducts
          .where('courseId')
          .equals(formData.courseId)
          .filter(cp => !cp.deleted_at && cp.productId === formData.productId)
          .first();

        if (existing) {
          toast.error('هذا الكتاب مربوط بالفعل بهذا الكورس مسبقاً');
          return;
        }

        const newCourseProduct: CourseProduct = {
          id: uuidv4(),
          courseId: formData.courseId,
          productId: formData.productId,
          isMandatory: formData.isMandatory,
          discountType: formData.discountType,
          discountValue: calculatedDiscountValue,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };

        await db.courseProducts.add(newCourseProduct);
        toast.success('تم ربط الكتاب بالكورس بنجاح');
      }
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'تعديل ربط الكتاب بالكورس' : 'ربط كتاب / مذكرة بكورس'}
          </h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر الكورس *</label>
            <select 
              required
              disabled={isEdit}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60"
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
              disabled={isEdit}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60"
              value={formData.productId}
              onChange={e => setFormData({ ...formData, productId: e.target.value })}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({toMajorUnits(p.salePrice)} ج.م)</option>
              ))}
            </select>
          </div>

          {/* Mandatory Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <input 
                type="checkbox"
                checked={formData.isMandatory}
                onChange={e => setFormData({ ...formData, isMandatory: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">مذكرة إجبارية مع الاشتراك</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">يتعين على جميع طلاب الكورس استلام هذه النسخة</div>
              </div>
            </label>
          </div>

          {/* Discount Configuration */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الخصم لطلاب الكورس</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                value={formData.discountType}
                onChange={e => setFormData({ ...formData, discountType: e.target.value as any })}
              >
                <option value="none">بدون خصم (السعر كامل)</option>
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
                  max={formData.discountType === 'percentage' ? 100 : basePrice}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-bold"
                  value={formData.discountValue}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Price preview */}
          {selectedProduct && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/60 text-xs flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">السعر النهائي للطالب:</span>
              <span className="font-bold text-sm text-blue-700 dark:text-blue-300">{finalPrice} ج.م</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              {isEdit ? 'حفظ التعديلات' : 'تأكيد الربط'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// "Print Buyers List" Modal & Printable Sheet
function BuyersListModal({
  courseProduct,
  course,
  product,
  groups,
  enrollments,
  sales,
  students,
  onClose
}: {
  courseProduct: CourseProduct;
  course?: Course;
  product?: Product;
  groups: Group[];
  enrollments: Enrollment[];
  sales: ProductSale[];
  students: Student[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'purchased' | 'pending'>('all');
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Groups in this course
  const courseGroups = groups.filter(g => g.courseId === courseProduct.courseId);
  const groupMap = new Map(courseGroups.map(g => [g.id, g.name]));
  const courseGroupIds = new Set(courseGroups.map(g => g.id));

  // Active enrollments for this course
  const courseEnrollments = enrollments.filter(e => courseGroupIds.has(e.groupId));
  const enrolledStudentIds = Array.from(new Set(courseEnrollments.map(e => e.studentId)));

  // Map enrolled student to their group name
  const studentGroupMap = new Map<string, string>();
  courseEnrollments.forEach(e => {
    studentGroupMap.set(e.studentId, groupMap.get(e.groupId) || 'المجموعة');
  });

  // Sales for this product
  const productSales = sales.filter(s => s.productId === courseProduct.productId);

  // Group sales by studentId
  const salesByStudentId = new Map<string, ProductSale[]>();
  productSales.forEach(s => {
    if (s.studentId) {
      const existing = salesByStudentId.get(s.studentId) || [];
      existing.push(s);
      salesByStudentId.set(s.studentId, existing);
    }
  });

  // Enrolled students list with purchase status
  const roster = enrolledStudentIds.map(studentId => {
    const student = studentMap.get(studentId);
    const studentSalesList = salesByStudentId.get(studentId) || [];
    const hasPurchased = studentSalesList.length > 0;
    const latestSale = studentSalesList[0];
    const totalQty = studentSalesList.reduce((sum, s) => sum + s.quantity, 0);
    const totalPaid = studentSalesList.reduce((sum, s) => sum + s.total, 0);

    return {
      studentId,
      studentName: student?.name || 'طالب غير معروف',
      phone: student?.phone || '—',
      parentPhone: student?.parentPhone || '—',
      groupName: studentGroupMap.get(studentId) || '—',
      hasPurchased,
      quantity: totalQty,
      totalPaid,
      saleDate: latestSale?.saleDate || '—',
      receiptNumber: latestSale?.receiptNumber || '—',
      paymentMethod: latestSale?.paymentMethod || '—'
    };
  });

  // Additional buyers who are not enrolled in this course (external/walk-in)
  const externalSales = productSales.filter(s => !s.studentId || !enrolledStudentIds.includes(s.studentId));
  const externalBuyers = externalSales.map(s => {
    const student = s.studentId ? studentMap.get(s.studentId) : null;
    return {
      studentId: s.studentId || s.id,
      studentName: student?.name || s.customerName || 'عميل خارجي',
      phone: student?.phone || '—',
      parentPhone: student?.parentPhone || '—',
      groupName: 'شراء مباشر / غير مقيد',
      hasPurchased: true,
      quantity: s.quantity,
      totalPaid: s.total,
      saleDate: s.saleDate,
      receiptNumber: s.receiptNumber,
      paymentMethod: s.paymentMethod
    };
  });

  // KPI calculations
  const totalEnrolled = roster.length;
  const purchasedCount = roster.filter(r => r.hasPurchased).length;
  const pendingCount = totalEnrolled - purchasedCount;
  const totalEnrolledRevenue = roster.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalAllRevenue = productSales.reduce((sum, s) => sum + s.total, 0);
  const fulfillmentRate = totalEnrolled > 0 ? Math.round((purchasedCount / totalEnrolled) * 100) : 0;

  // Filtered roster based on tab
  let displayedRows = roster;
  if (activeTab === 'purchased') {
    displayedRows = [...roster.filter(r => r.hasPurchased), ...externalBuyers];
  } else if (activeTab === 'pending') {
    displayedRows = roster.filter(r => !r.hasPurchased);
  } else {
    // All
    displayedRows = [...roster, ...externalBuyers];
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      {/* Container with print specific styles */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Header (Hidden on physical print) */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                كشف استلام ومبيعات الكتاب: {product?.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                المادة: {course?.name} | {courseProduct.isMandatory ? 'مذكرة إلزامية' : 'كتاب اختياري'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              طباعة الكشف
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs & Summary Cards (Hidden on physical print) */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4 print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">إجمالي المقيدين</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalEnrolled} طالب</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block mb-0.5">المستلمين / المشترين</span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{purchasedCount} ({fulfillmentRate}%)</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/50">
              <span className="text-xs text-amber-700 dark:text-amber-400 block mb-0.5">لم يشتروا بعد</span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{pendingCount} طالب</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50">
              <span className="text-xs text-blue-700 dark:text-blue-400 block mb-0.5">إجمالي المبيعات المحصلة</span>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{toMajorUnits(totalAllRevenue)} ج.م</span>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pt-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'all' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              كافة الطلاب ({roster.length + externalBuyers.length})
            </button>
            <button
              onClick={() => setActiveTab('purchased')}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'purchased' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              المشترين والمستلمين ({purchasedCount + externalBuyers.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'pending' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              طلاب لم يشتروا بعد ({pendingCount})
            </button>
          </div>
        </div>

        {/* Printable Section */}
        <div className="p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          
          {/* Printable Formal Header */}
          <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900 text-slate-900">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">مسار — سنتر الإدارة التعليمية</h1>
                <h2 className="text-lg font-semibold mt-1">كشف استلام ومبيعات الكتاب والمذكرات المنهجية</h2>
              </div>
              <div className="text-left text-xs space-y-1">
                <p><strong>تاريخ التقرير:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                <p><strong>حالة المذكرة:</strong> {courseProduct.isMandatory ? 'مذكرة إلزامية للمادة' : 'كتاب اختياري'}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4 p-3 bg-slate-50 rounded border border-slate-300 text-xs">
              <div>
                <span className="text-slate-500 block">اسم الكورس:</span>
                <span className="font-bold">{course?.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">اسم الكتاب / الصنف:</span>
                <span className="font-bold">{product?.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">سعر الوحدة:</span>
                <span className="font-bold">{toMajorUnits(product?.salePrice || 0)} ج.م</span>
              </div>
              <div>
                <span className="text-slate-500 block">نسبة الاستلام:</span>
                <span className="font-bold">{purchasedCount} من {totalEnrolled} ({fulfillmentRate}%)</span>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden print:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-200 print:text-slate-900 border-b border-slate-200 dark:border-slate-700 print:border-slate-800">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">اسم الطالب</th>
                  <th className="p-2.5">المجموعة</th>
                  <th className="p-2.5">هاتف الطالب</th>
                  <th className="p-2.5">هاتف ولي الأمر</th>
                  <th className="p-2.5 text-center">الحالة</th>
                  <th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5">المسدد</th>
                  <th className="p-2.5">رقم الإيصال</th>
                  <th className="p-2.5 w-24 text-center print:table-cell">توقيع الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      لا يوجد طلاب في هذه القائمة
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, idx) => (
                    <tr key={row.studentId + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 print:text-black">
                        {row.studentName}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 print:text-black">
                        {row.groupName}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300 print:text-black">
                        {row.phone}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300 print:text-black">
                        {row.parentPhone}
                      </td>
                      <td className="p-2.5 text-center">
                        {row.hasPurchased ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 print:bg-transparent print:text-black">
                            <Check className="w-3 h-3 ml-0.5" />
                            تم الشراء
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 print:bg-transparent print:text-black">
                            لم يستلم
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {row.quantity > 0 ? row.quantity : '—'}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                        {row.totalPaid > 0 ? `${toMajorUnits(row.totalPaid)} ج.م` : '—'}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-blue-600 dark:text-blue-400 print:text-black">
                        {row.receiptNumber !== '—' ? row.receiptNumber : '—'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-800 text-center">
                        <div className="h-6 w-full border-b border-dashed border-slate-300 dark:border-slate-600 print:border-slate-400"></div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Formal Signatures Footer (Visible on physical print) */}
          <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
            <div>
              <p className="font-bold mb-8">مسؤول المخزن والمبيعات</p>
              <p className="border-t border-dotted border-slate-400 pt-1">التوقيع: ...........................</p>
            </div>
            <div>
              <p className="font-bold mb-8">مشرف المادة التعليمية</p>
              <p className="border-t border-dotted border-slate-400 pt-1">التوقيع: ...........................</p>
            </div>
            <div>
              <p className="font-bold mb-8">اعتماد إدارة السنتر</p>
              <p className="border-t border-dotted border-slate-400 pt-1">الختم والاعتماد: ...........................</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
