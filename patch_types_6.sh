#!/bin/bash
sed -i 's/  academyName: string;/  academyName?: string;/g' src/types.ts
sed -i 's/  whatsappNumber: string;/  whatsappNumber?: string;/g' src/types.ts
sed -i 's/  currency: string;/  currency?: string;/g' src/types.ts
sed -i 's/  theme: '\''light'\'' | '\''dark'\'' | '\''system'\'';/  theme?: '\''light'\'' | '\''dark'\'' | '\''system'\'';/g' src/types.ts


