import Link from "next/link";
import { EditIcon, TrashIcon } from "./icons";

type DeleteState = "idle" | "confirming" | "deleting";

type Props = {
  deleteState: DeleteState;
  onDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  editHref: string;
  editLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  confirmMsg: string;
  cancelLabel: string;
  confirmLabel: string;
};

export function DeleteConfirmActions({
  deleteState,
  onDelete,
  onConfirm,
  onCancel,
  editHref,
  editLabel,
  deleteLabel,
  deletingLabel,
  confirmMsg,
  cancelLabel,
  confirmLabel,
}: Props) {
  if (deleteState === "confirming") {
    return (
      <div className="inline-confirm">
        <span className="inline-confirm-msg">{confirmMsg}</span>
        <button className="btn-link" onClick={onCancel} type="button">
          {cancelLabel}
        </button>
        <button className="btn btn-danger" onClick={onDelete} type="button">
          {confirmLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <Link className="btn btn-secondary" href={editHref}>
        <EditIcon size={15} />
        {editLabel}
      </Link>
      <button
        className="btn btn-danger"
        disabled={deleteState === "deleting"}
        onClick={onConfirm}
        type="button"
      >
        <TrashIcon size={15} />
        {deleteState === "deleting" ? deletingLabel : deleteLabel}
      </button>
    </>
  );
}
