import { BottomPanel } from '@/components/ui';
import { BookingSheetContent } from '@/features/booking/components/BookingSheetContent';
import { OrderButton } from '@/features/booking/components/OrderButton';
import { useBookingDraft } from '@/features/booking/store';
import type { Place } from '@/types/place';

import { HomeSheetContent } from './HomeSheetContent';
import { PinPickContent } from './PinPickContent';

export interface HomePanelProps {
  pinnedPlace: Place | null;
  pinLoading: boolean;
  onHeightChange: (height: number) => void;
}

/**
 * The one persistent sheet on home, in three modes: "Where to?", choosing a point on the map
 * (pickup or destination), and booking (vehicles, promo, payment + pinned Order button).
 */
export function HomePanel({ pinnedPlace, pinLoading, onHeightChange }: HomePanelProps) {
  const mapPick = useBookingDraft((s) => s.mapPick);
  const hasDestination = useBookingDraft((s) => s.destination !== null);
  const booking = hasDestination && mapPick === null;

  return (
    <BottomPanel
      onHeightChange={onHeightChange}
      scrollable={booking}
      footer={booking ? <OrderButton /> : undefined}
      testID="home-sheet"
    >
      {mapPick ? (
        <PinPickContent target={mapPick} pinnedPlace={pinnedPlace} loading={pinLoading} />
      ) : booking ? (
        <BookingSheetContent />
      ) : (
        <HomeSheetContent pinLoading={pinLoading} />
      )}
    </BottomPanel>
  );
}
