#!/bin/bash
sed -i "s/import { toMajorUnits } from '..\/..\/utils\/currency';/import { toMajorUnits } from '..\/..\/utils\/currency';\nimport { useSubscription } from '..\/..\/context\/SubscriptionContext';/g" src/pages/Reports/Reports.tsx
sed -i "s/const \[activeTab, setActiveTab\] = useState<'financials' | 'students' | 'courses' | 'products'>('financials');/const \[activeTab, setActiveTab\] = useState<'financials' | 'students' | 'courses' | 'products' | 'advanced'>('financials');\n  const { subscription } = useSubscription();/g" src/pages/Reports/Reports.tsx
