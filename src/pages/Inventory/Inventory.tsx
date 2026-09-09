import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Package, Plus, ShoppingCart, Trash2, Edit2, X, AlertTriangle, BookOpen, Search, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductSale } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';

export function Inventory() {
  const [activeTab, setActiveTab] = useState<'products' | 'sales'>('products');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSellProductOpen, setIsSellProductOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'book' | 'other'>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();

  const products = useLiveQuery(() => db.products.filter(p => !p.deleted_at).toArray(), []);
  const sales = useLiveQuery(() => db.productSales.filter(s => !s.deleted_at).reverse().sortBy('saleDate'), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);

  const productMap = new Map(products?.map(p => [p.id, p]));

  const filteredProducts = products?.filter(prod => {
    if (searchTerm && !prod.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilter !== 'all' && prod.type !== typeFilter) return false;
    if (lowStockOnly && prod.stockQty >= 5) return false;
    return true;
  });

  const totalSalesRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalQuantitySold = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0;
  const totalProfit = sales?.reduce((sum, s) => {
    const p = productMap.get(s.productId);
    if (!p) return sum;
    const profitPerItem = p.salePrice - p.costPrice;
    return sum + (profitPerItem * s.quantity);
  }, 0) || 0;

  const handleDeleteProduct = async (id: string, name?: string) => {
    const isConfirmed = await confirm({
      title: 'حذف المنتج من المخزون',
      message: `هل أنت متأكد من حذف المنتج ${name ? `(${name})` : ''}؟`,
      description: 'سيتم نقل المنتج إلى سلة المهملات وإلغاء ظهوره في المخزون النشط.',
      confirmText: 'نعم، احذف المنتج',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
      try {
        const now = Date.now();
        await db.products.update(id, {
          deleted_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success(`تم حذف المنتج ${name ? `(${name})` : ''} بنجاح`);
      } catch (err) {
        toast.error('فشل حذف المنتج');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">المخزون والمبيعات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">إدارة المذكرات المطبوعة، الكتب، وتتبع عمليات البيع والأرباح</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 ml-1.5" />
            إضافة منتج/مذكرة
          </button>
          <button 
            onClick={() => setIsSellProductOpen(true)}
            className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-xs font-semibold shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 ml-1.5" />
            بيع منتج
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 bg-slate-50/50 dark:bg-slate-900">
          <button 
            onClick={() => setActiveTab('products')} 
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'products' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            المنتجات والمذكرات ({products?.length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('sales')} 
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'sales' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            سجل المبيعات ({sales?.length || 0})
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Search and Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="البحث باسم الصنف أو المذكرة..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as any)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">جميع الأصناف</option>
                    <option value="book">مذكرات وكتب تعليمية</option>
                    <option value="other">أدوات ومنتجات أخرى</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={e => setLowStockOnly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                    />
                    <span>نقص المخزون (&lt; 5)</span>
                  </label>
                </div>
              </div>

              {filteredProducts?.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {searchTerm || typeFilter !== 'all' || lowStockOnly ? 'لا توجد نتائج مطابقة للبحث أو الفلتر' : 'لا توجد منتجات أو مذكرات في المخزون'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    {searchTerm || typeFilter !== 'all' || lowStockOnly ? 'جرّب تعديل خيارات البحث والفلترة' : 'اضغط على "إضافة منتج/مذكرة" لإدخال أول صنف للمخزن.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts?.map(prod => {
                    const profitPerUnit = toMajorUnits(prod.salePrice) - toMajorUnits(prod.costPrice);
                    const isLowStock = prod.stockQty < 5;

                    return (
                      <div key={prod.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between bg-white dark:bg-slate-900">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {prod.type === 'book' ? 'مذكرة / كتاب' : 'أخرى'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingProduct(prod)}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded transition-colors"
                                title="تعديل الصنف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded transition-colors"
                                title="حذف الصنف (حذف ناعم)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 mt-1">
                            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{prod.name}</h3>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">سعر البيع:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{toMajorUnits(prod.salePrice)} ج.م</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">تكلفة الشراء/الطباعة:</span>
                              <span className="font-mono">{toMajorUnits(prod.costPrice)} ج.م</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                              <span>هامش الربح للنسخة:</span>
                              <span className="font-mono font-semibold">+{profitPerUnit} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-slate-500 dark:text-slate-400">الرصيد المتاح:</span>
                              <span className={`font-mono font-bold text-xs flex items-center ${isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 text-amber-500" />}
                                {prod.stockQty} نسخة
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400 dark:text-slate-500 text-[11px]">
                              <span>إجمالي المبيعات السابقة:</span>
                              <span className="font-mono">{prod.soldQty || 0} نسخة</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setIsSellProductOpen(true)}
                            className="w-full py-1.5 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold transition-colors text-center"
                          >
                            بيع نسخة الآن
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">إجمالي الإيرادات</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{toMajorUnits(totalSalesRevenue)} ج.م</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">صافي الأرباح</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{toMajorUnits(totalProfit)} ج.م</span>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">الكمية المباعة</span>
                  <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{totalQuantitySold} وحدة</span>
                </div>
              </div>

              {sales?.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد عمليات بيع مسجلة بعد</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">اضغط على زر "بيع منتج" لتسجيل أول عملية بيع.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">المنتج</th>
                          <th className="px-4 py-2.5 font-semibold">العميل / الطالب</th>
                          <th className="px-4 py-2.5 font-semibold text-center">الكمية</th>
                          <th className="px-4 py-2.5 font-semibold text-center">الإجمالي</th>
                          <th className="px-4 py-2.5 font-semibold text-center">طريقة الدفع</th>
                          <th className="px-4 py-2.5 font-semibold text-center">التاريخ</th>
                          <th className="px-4 py-2.5 font-semibold text-center">رقم الإيصال</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sales?.map(sale => {
                          const product = productMap.get(sale.productId);
                          return (
                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{product?.name || 'منتج غير معروف'}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{sale.customerName || 'عميل نقدي'}</td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">{sale.quantity}</td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{toMajorUnits(sale.total)} ج.م</td>
                              <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-[11px]">{sale.paymentMethod}</td>
                              <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">{sale.saleDate}</td>
                              <td className="px-4 py-3 text-center font-mono text-[11px] text-blue-600 dark:text-blue-400">{sale.receiptNumber}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(isAddProductOpen || editingProduct) && (
        <ProductModal 
          product={editingProduct}
          onClose={() => {
            setIsAddProductOpen(false);
            setEditingProduct(null);
          }} 
        />
      )}

      {isSellProductOpen && (
        <SellProductModal 
          onClose={() => setIsSellProductOpen(false)} 
          products={products || []}
          students={students || []}
        />
      )}
    </div>
  );
}

function ProductModal({ 
  onClose, 
  product 
}: { 
  onClose: () => void; 
  product?: Product | null;
}) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    type: (product?.type || 'book') as 'book' | 'other',
    salePrice: product ? toMajorUnits(product.salePrice).toString() : '',
    costPrice: product ? toMajorUnits(product.costPrice).toString() : '',
    stockQty: product ? product.stockQty.toString() : '25'
  });

  const isEdit = !!product;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      if (isEdit) {
        await db.products.update(product.id, {
          name: formData.name,
          type: formData.type,
          salePrice: toMinorUnits(Number(formData.salePrice)),
          costPrice: toMinorUnits(Number(formData.costPrice)),
          stockQty: Number(formData.stockQty),
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success(`تم تحديث بيانات الصنف (${formData.name}) بنجاح`);
      } else {
        const newProduct: Product = {
          id: uuidv4(),
          name: formData.name,
          type: formData.type,
          salePrice: toMinorUnits(Number(formData.salePrice)),
          costPrice: toMinorUnits(Number(formData.costPrice)),
          stockQty: Number(formData.stockQty),
          soldQty: 0,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };

        await db.products.add(newProduct);
        toast.success(`تمت إضافة الصنف (${formData.name}) للمخزن بنجاح`);
      }
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الصنف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'تعديل بيانات الصنف / المذكرة' : 'إضافة صنف للمخزون'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الصنف / المذكرة *</label>
            <input 
              required
              type="text"
              placeholder="مثال: مذكرة مراجعة الكيمياء للصف الثالث"
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">النوع</label>
            <select
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="book">مذكرة / كتاب تعليمي</option>
              <option value="other">أدوات / أخرى</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سعر البيع (ج.م) *</label>
              <input 
                required
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.salePrice}
                onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سعر التكلفة (ج.م)</label>
              <input 
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الرصيد المتاح حالياً (الكمية) *</label>
            <input 
              required
              type="number"
              min="0"
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.stockQty}
              onChange={e => setFormData({ ...formData, stockQty: e.target.value })}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors shadow-xs"
            >
              {isEdit ? 'حفظ التعديلات' : 'إضافة للمخزن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SellProductModal({ 
  onClose, 
  products, 
  students 
}: { 
  onClose: () => void; 
  products: Product[]; 
  students: any[]; 
}) {
  const toast = useToast();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('1');
  const [customerType, setCustomerType] = useState<'student' | 'external'>('student');
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalAmount = (selectedProduct?.salePrice || 0) * (Number(quantity) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qtyNum = Number(quantity);
    if (qtyNum <= 0) return;
    if (selectedProduct.stockQty < qtyNum) {
      toast.error('الكمية المطلوبة أكبر من الرصيد المتوفر في المخزن!');
      return;
    }

    const now = Date.now();
    const finalCustomerName = customerType === 'student'
      ? students.find(s => s.id === studentId)?.name || 'طالب'
      : customerName || 'عميل نقدي';

    const saleId = uuidv4();
    const receiptNumber = 'REC-' + Math.floor(100000 + Math.random() * 900000);

    const newSale: ProductSale = {
      id: saleId,
      productId: selectedProduct.id,
      quantity: qtyNum,
      customerName: finalCustomerName,
      studentId: customerType === 'student' ? studentId : undefined,
      discountType: 'none',
      discountValue: 0,
      subtotal: totalAmount,
      total: totalAmount,
      paymentMethod,
      saleDate: new Date().toISOString().split('T')[0],
      receiptNumber,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    // 1. Record the sale
    await db.productSales.add(newSale);

    // 2. Decrement product stock & increment sold count
    await db.products.update(selectedProduct.id, {
      stockQty: selectedProduct.stockQty - qtyNum,
      soldQty: (selectedProduct.soldQty || 0) + qtyNum,
      updated_at: now
    });

    // 3. Record in ledger revenue!
    await db.ledgerEntries.add({
      id: uuidv4(),
      type: 'revenue',
      category: 'مبيعات كتب وملازم',
      amount: totalAmount,
      date: new Date().toISOString().split('T')[0],
      description: `بيع ${qtyNum} نسخة من (${selectedProduct.name}) إلى ${finalCustomerName}`,
      relatedType: 'product',
      relatedId: saleId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });

    toast.success(`تم تسجيل عملية البيع بنجاح! إيصال رقم: ${receiptNumber}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">تسجيل عملية بيع منتج</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اختر الصنف *</label>
            <select
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - (السعر: {toMajorUnits(p.salePrice)} ج.م | الرصيد: {p.stockQty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الكمية *</label>
              <input 
                required
                type="number"
                min="1"
                max={selectedProduct?.stockQty || 999}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</label>
              <select
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="نقدي">نقدي (كاش)</option>
                <option value="فودافون كاش">فودافون كاش / إنستاباي</option>
                <option value="فيزا">بطاقة بنكية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">العميل</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="custType" 
                  checked={customerType === 'student'} 
                  onChange={() => setCustomerType('student')}
                  className="ml-1.5 text-emerald-600 focus:ring-emerald-500"
                />
                طالب مسجل
              </label>
              <label className="flex items-center text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="custType" 
                  checked={customerType === 'external'} 
                  onChange={() => setCustomerType('external')}
                  className="ml-1.5 text-emerald-600 focus:ring-emerald-500"
                />
                عميل خارجي / نقدي
              </label>
            </div>

            {customerType === 'student' ? (
              <select
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
            ) : (
              <input 
                type="text"
                placeholder="اسم العميل أو اتركه فارغاً"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            )}
          </div>

          {/* Price preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md flex items-center justify-between border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">المبلغ المطلوب تحصيله:</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{toMajorUnits(totalAmount)} ج.م</span>
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors shadow-xs"
            >
              تأكيد البيع والتحصيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
