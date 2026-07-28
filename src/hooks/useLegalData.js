import { useLegalData as useDataContext } from '../context/DataContext';

export default function useLegalData() {
  return useDataContext();
}
