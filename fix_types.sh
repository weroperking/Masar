#!/bin/bash
sed -i '/amountTotal/!b;n' src/types.ts
# It's easier to just recreate it or clean it up.
