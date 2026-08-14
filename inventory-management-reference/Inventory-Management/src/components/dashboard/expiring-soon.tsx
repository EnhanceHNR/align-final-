'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, firestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { InventoryItem } from '@/lib/types';

function getDaysUntilExpiry(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function ExpiringSoon() {
  const itemsCollection = useMemo(() => collection(firestore, 'items'), []);
  const { data: inventoryItems, isLoading } = useCollection<InventoryItem>(itemsCollection);
  
  const expiringItems = useMemo(() => {
      if (!inventoryItems) return [];
      
      return inventoryItems
        .flatMap(item => 
          item.stock?.map(stockEntry => ({
            ...item,
            id: `${item.id}-${stockEntry.expiryDate}`, // Create unique key for rendering
            daysLeft: getDaysUntilExpiry(stockEntry.expiryDate),
            stockQuantity: stockEntry.quantity,
          })) || []
        )
        .filter(item => item.daysLeft > 0 && item.daysLeft <= 120)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);
  }, [inventoryItems]);

  const itemImages = PlaceHolderImages.filter(img => img.id.startsWith('item-photo'));
  
  if(isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {expiringItems.length > 0 ? (
        expiringItems.map((item, index) => (
          <div key={item.id} className="flex items-center gap-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={itemImages[index % itemImages.length]?.imageUrl} alt={item.name} data-ai-hint="dental supply" />
              <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none">{item.name} ({item.stockQuantity} {item.quantity.unit})</p>
              <p className="text-sm text-muted-foreground">{item.brandName}</p>
            </div>
            <div className={`text-sm font-medium text-right ${item.daysLeft < 30 ? 'text-destructive' : ''}`}>
              {item.daysLeft} days left
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No items are expiring soon.</p>
      )}
    </div>
  );
}
