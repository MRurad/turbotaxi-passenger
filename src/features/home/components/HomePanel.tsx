import { BottomPanel } from '@/components/ui';
import { BookingSheetContent } from '@/features/booking/components/BookingSheetContent';
import { OrderButton } from '@/features/booking/components/OrderButton';
import { useBookingDraft } from '@/features/booking/store';
import type { Place } from '@/types/place';

import { HomeSheetContent } from './HomeSheetContent';
import { PinDestinationContent } from './PinDestinationContent';

export interface HomePanelProps {
  pinnedPlace: Place | null;
  pinLoading: boolean;
  onHeightChange: (height: number) => void;
}

/**
 * The one persistent sheet on home, in three modes: "Where to?", choosing the destination on
 * the map, and booking (vehicles, promo, payment + pinned Order button).
 */
export function HomePanel({ pinnedPlace, pinLoading, onHeightChange }: HomePanelProps) {
  const choosingDestination = useBookingDraft((s) => s.pinTarget === 'destination');
  const hasDestination = useBookingDraft((s) => s.destination !== null);
  const booking = hasDestination && !choosingDestination;

  return (
    <BottomPanel
      onHeightChange={onHeightChange}
      scrollable={booking}
      footer={booking ? <OrderButton /> : undefined}
      testID="home-sheet"
    >
      {choosingDestination ? (
        <PinDestinationContent pinnedPlace={pinnedPlace} loading={pinLoading} />
      ) : booking ? (
        <BookingSheetContent />
      ) : (
        <HomeSheetContent pinLoading={pinLoading} />
      )}
    </BottomPanel>
  );
}
