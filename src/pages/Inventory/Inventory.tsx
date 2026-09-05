import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Package, Plus, ShoppingCart, Trash2, X, AlertTriangle, BookOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductSale } from '../../types';
import { useToast } from '../../context/ToastContext';

export function Inventory() {
  const [activeTab, setActiveTab] = useState<'products' | 'sales'>('products');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSellProductOpen, setIsSellProductOpen] = useState(false);
  const toast = useToast();

  const products = useLiveQuery(() => db.products.toArray(), []);
  const sales = useLiveQuery(() => db.productSales.reverse().sortBy('saleDate'), []);
  const students = useLiveQuery(() => db.students.toArray(), []);

  const productMap = new Map(products?.map(p => [p.id, p]));

  const handleDeleteProduct = async (id: string, name?: string) => {
    if (confirm(`هل أنت متأكد من حذف هذا المنتج؟`)) {
      try {
        await db.products.delete(id);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المخزون والمبيعات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">إدارة المذكرات المطبوعة، الكتب، وتتبع عمليات البيع والأرباح</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            إضافة منتج/مذكرة
          </button>
          <button 
            onClick={() => setIsSellProductOpen(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 ml-1.5" />
            بيع منتج
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('products')} 
            className={`px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-300'
            }`}
          >
            المنتجات والمذكرات ({products?.length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('sales')} 
            className={`px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sales' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-300'
            }`}
          >
            سجل المبيعات ({sales?.length || 0})
          </button>
        </div>

        <div className="p-6">
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div>
              {products?.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <Package className="w-12 h-12 text-slate-300 mb-4" />
                  <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد منتجات أو مذكرات في المخزون</h2>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1">اضغط على "إضافة منتج/مذكرة" لإدخال أول صنف للمخزن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {products?.map(prod => {
                    const profitPerUnit = prod.salePrice - prod.costPrice;
                    const isLowStock = prod.stockQty < 5;

                    return (
                      <div key={prod.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {prod.type === 'book' ? 'مذكرة / كتاب' : 'أخرى'}
                            </span>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-start gap-2.5 mt-2">
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">{prod.name}</h3>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex justify-between">
                              <span>سعر البيع:</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{prod.salePrice} ج.م</span>
                            </div>
                            <div className="flex justify-between">
                              <span>تكلفة الشراء/الطباعة:</span>
                              <span>{prod.costPrice} ج.م</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>هامش الربح للنسخة:</span>
                              <span>+{profitPerUnit} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span>الرصيد المتاح بالمخزن:</span>
                              <span className={`font-bold text-sm flex items-center ${isLowStock ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                {isLowStock && <AlertTriangle className="w-3.5 h-3.5 ml-1 text-amber-500" />}
                                {prod.stockQty} نسخة
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400 dark:text-slate-500 text-[11px]">
                              <span>إجمالي المبيعات السابقة:</span>
                              <span>{prod.soldQty || 0} نسخة</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setIsSellProductOpen(true)}
                            className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
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
            <div>
              {sales?.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mb-4" />
                  <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد عمليات بيع مسجلة بعد</h2>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1">اضغط على زر "بيع منتج" لتسجيل أول عملية بيع.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-900 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-r-lg">المنتج</th>
                        <th className="px-4 py-3 font-medium">العميل / الطالب</th>
                        <th className="px-4 py-3 font-medium">الكمية</th>
                        <th className="px-4 py-3 font-medium">الإجمالي</th>
                        <th className="px-4 py-3 font-medium">طريقة الدفع</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium rounded-l-lg">رقم الإيصال</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales?.map(sale => {
                        const product = productMap.get(sale.productId);
                        return (
                          <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:bg-slate-800/60 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{product?.name || 'منتج غير معروف'}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{sale.customerName || 'عميل نقدي'}</td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{sale.quantity}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600 text-base">{sale.total} ج.م</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs">{sale.paymentMethod}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs">{sale.saleDate}</td>
                            <td className="px-4 py-3 font-mono text-xs text-blue-600">{sale.receiptNumber}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isAddProductOpen && (
        <AddProductModal onClose={() => setIsAddProductOpen(false)} />
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

function AddProductModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'book' as 'book' | 'other',
    salePrice: '',
    costPrice: '',
    stockQty: '25'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const newProduct: Product = {
        id: uuidv4(),
        name: formData.name,
        type: formData.type,
        salePrice: Number(formData.salePrice),
        costPrice: Number(formData.costPrice),
        stockQty: Number(formData.stockQty),
        soldQty: 0,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };

      await db.products.add(newProduct);
      toast.success(`تمت إضافة الصنف (${formData.name}) بنجاح`);
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الصنف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة صنف للمخزون</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الصنف / المذكرة *</label>
            <input 
              required
              type="text"
              placeholder="مثال: مذكرة مراجعة الكيمياء للصف الثالث"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">النوع</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="book">مذكرة / كتاب تعليمي</option>
              <option value="other">أدوات / أخرى</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">سعر البيع (ج.م) *</label>
              <input 
                required
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                value={formData.salePrice}
                onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">سعر التكلفة (ج.م)</label>
              <input 
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرصيد المتاح حالياً (الكمية)</label>
            <input 
              required
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.stockQty}
              onChange={e => setFormData({ ...formData, stockQty: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              إضافة للمخزن
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسجيل عملية بيع منتج</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر الصنف *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - (السعر: {p.salePrice} ج.م | الرصيد: {p.stockQty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكمية *</label>
              <input 
                required
                type="number"
                min="1"
                max={selectedProduct?.stockQty || 999}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العميل</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                <input 
                  type="radio" 
                  name="custType" 
                  checked={customerType === 'student'} 
                  onChange={() => setCustomerType('student')}
                  className="ml-1.5 text-emerald-600"
                />
                طالب مسجل
              </label>
              <label className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                <input 
                  type="radio" 
                  name="custType" 
                  checked={customerType === 'external'} 
                  onChange={() => setCustomerType('external')}
                  className="ml-1.5 text-emerald-600"
                />
                عميل خارجي / نقدي
              </label>
            </div>

            {customerType === 'student' ? (
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            )}
          </div>

          {/* Price preview */}
          <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between border border-emerald-100">
            <span className="text-sm text-emerald-800 font-medium">المبلغ المطلوب تحصيله:</span>
            <span className="text-xl font-bold text-emerald-700">{totalAmount} ج.م</span>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold">
              تأكيد البيع والتحصيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
