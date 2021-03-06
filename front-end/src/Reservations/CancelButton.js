import { useHistory } from "react-router-dom";
import { updateStatus } from "../utils/api";

function CancelButton({ reservation_id }) {
  const history = useHistory();

  async function handleClick() {
    if (
      window.confirm(
        "Do you want to cancel this reservation? This cannot be undone."
      )
    ) {
      const controller = new AbortController();
      await updateStatus(reservation_id, "cancelled", controller.signal);
      history.go(0);
      return () => controller.abort();
    }
  }

  return (
    <button
      data-reservation-id-cancel={reservation_id}
      className="btn btn-danger"
      onClick={() => handleClick(reservation_id)}
    >
      Cancel
    </button>
  );
}

export default CancelButton;