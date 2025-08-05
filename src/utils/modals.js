import { useModal } from '../context/ModalContext';
import QuantityModal from '../components/modals/QuantityModal';

export const useQuantityModal = () => {
  const { openModal } = useModal();
  return (product) => {
    openModal(<QuantityModal product={product} />);
  };
};
