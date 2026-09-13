#!/bin/bash
cat << 'PATCH' > tabs.patch
--- src/pages/Reports/Reports.tsx
+++ src/pages/Reports/Reports.tsx
@@ -118,8 +118,9 @@
             { id: 'financials', label: 'الأداء المالي والتدفقات' },
             { id: 'students', label: 'الطلاب ومصادر التسجيل' },
             { id: 'courses', label: 'الكورسات والاشتراكات' },
-            { id: 'products', label: 'المخزون والمبيعات' },
-          ].map((tab) => (
+            ...(subscription?.limits?.inventory_sales !== false ? [{ id: 'products', label: 'المخزون والمبيعات' }] : []),
+            ...(subscription?.limits?.advanced_analytics ? [{ id: 'advanced', label: 'تحليلات متقدمة' }] : []),
+          ].map((tab: any) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
PATCH
patch src/pages/Reports/Reports.tsx tabs.patch
