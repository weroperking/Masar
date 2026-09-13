#!/bin/bash
sed -i "s/import { useConfirm } from '..\/..\/context\/ConfirmContext';/import { useConfirm } from '..\/..\/context\/ConfirmContext';\nimport { useSubscription } from '..\/..\/context\/SubscriptionContext';/g" src/pages/Admin/Settings.tsx
sed -i "s/export function Settings() {/export function Settings() {\n  const { subscription } = useSubscription();/g" src/pages/Admin/Settings.tsx
