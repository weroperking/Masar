#!/bin/bash

# BookingRequest
sed -i '/export interface BookingRequest extends BaseRecord {/a \  name: string;\n  phone: string;\n  declaredAmount?: number;' src/types.ts
sed -i 's/status: '\''pending'\'' | '\''approved'\'' | '\''rejected'\'';/status: '\''pending'\'' | '\''approved'\'' | '\''rejected'\'' | '\''accepted'\'';/' src/types.ts

# LedgerEntry
sed -i 's/type: '\''income'\'' | '\''expense'\'';/type: '\''income'\'' | '\''expense'\'' | '\''revenue'\'' | '\''refund'\'';/' src/types.ts
sed -i 's/relatedType: '\''subscription'\'' | '\''session'\'' | '\''book'\'' | '\''salary'\'' | '\''rent'\'' | '\''other'\'';/relatedType: '\''subscription'\'' | '\''session'\'' | '\''book'\'' | '\''salary'\'' | '\''rent'\'' | '\''other'\'' | '\''manual'\'' | '\''product'\'';/' src/types.ts
sed -i '/export interface LedgerEntry extends BaseRecord {/a \  category?: string;' src/types.ts

# ProductSale
sed -i '/export interface ProductSale extends BaseRecord {/a \  customerName?: string;\n  total?: number;\n  receiptNumber?: string;' src/types.ts

# Settings
sed -i '/export interface Settings extends BaseRecord {/a \  autoStartEndSessions?: boolean;' src/types.ts

# QrCard
sed -i '/export interface QrCard extends BaseRecord {/a \  cardNumber?: string;' src/types.ts

# User
sed -i '/export interface User extends BaseRecord {/a \  branch?: string;' src/types.ts
sed -i 's/role: '\''admin'\'' | '\''manager'\'' | '\''teacher'\'' | '\''assistant'\'';/role: '\''admin'\'' | '\''manager'\'' | '\''teacher'\'' | '\''assistant'\'' | '\''staff'\'';/' src/types.ts
