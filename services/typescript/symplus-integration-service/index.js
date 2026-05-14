import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../Widget/Badge/Badge";
import { uploadFile } from "react-s3";
import { gdlAWSConfig } from "../../utils/helper";
import { connect } from "react-redux";
import {
  getAction,
  editAction,
} from "../../store/actions/creators/request.action";
import { showModal, showMessage } from "../../store/actions/creators/ui.action";
import { useForm } from "react-hook-form";
import { AppButton } from "../Widget/Button/AppButton";
import {
  FileField,
  SelectField,
  TextField,
} from "../Widget/Form/FormComponent";
import {
  ADD_OWNER_DOCS,
  GET_OWNER_DOCS,
  GET_PROOF_ADDR,
  GET_USER_DETAILS,
  GET_WALLETS,
} from "../../store/actions/action_types/action.types";
import {
  docsTypeURL,
  docsURL,
  proofURL,
  usersURL,
  walletURL,
} from "../../utils/endpoints";
import toast from "react-hot-toast";
import { LoaderII } from "../Widget/Loader/Loader";

const UploadModal = ({ token, ...props }) => {
  const [proof, setProof] = useState("");
  const [means, setMeans] = useState("");

  const { control, register, handleSubmit, formState, watch } = useForm({
    mode: "onChange",
    defaultValues: {
      user_id: props.user_info?.id,
      identification_doc_url: props.user_doc?.identification_doc_url,
      proof_of_address_url: props.user_doc?.proof_of_address_url,
      identification_number: props.user_doc?.identification_number ?? null,
    },
  });

  const { errors, isValid } = formState;
  const [docloading, setDocLoading] = useState(false);
  const [proofloading, setProofLoading] = useState(false);
  const [doc_error, setDocError] = useState("");
  const [proof_error, setProofError] = useState("");

  /** watch for when proof of address is selected */
  const is_proof_selected = watch("proof_of_address_doc");

  useEffect(() => {
    props.getAction(GET_OWNER_DOCS, docsURL, token);
    props.getAction(GET_PROOF_ADDR, proofURL, token);

    if (props.set_docs_msg) {
      props.showMessage("OPEN_MSG_MODAL", {
        message: "Document Added Successfully",
        msg_type: "success",
      });
      props.getAction(
        GET_USER_DETAILS,
        `${usersURL}/${props.user_info?.id}`,
        token
      );

      // recall wallet API
      const url_wallet = `${walletURL}/${props.user_info?.id}/${props.user_info?.user_txn_ref}`;
      props.getAction(GET_WALLETS, url_wallet, token);
    }
  }, [props.set_docs_msg]);

  const onSubmit = (data) => {
    data.identification_doc_url =
      means || props.user_doc?.identification_doc_url;
    data.proof_of_address_url = proof || props.user_doc?.proof_of_address_url;

    const url = `${docsTypeURL}/${props.user_doc?.id}`;
    props.editAction(ADD_OWNER_DOCS, url, data, token);
  };

  const uploadDocFile = async (file) => {
    setDocLoading(true);
    try {
      const file_upload = await uploadFile(file, gdlAWSConfig);

      if (file_upload) {
        setDocLoading(false);
        setMeans(file_upload.location);
      }
    } catch (error) {
      setDocLoading(false);
      toast.error("error occured");
      setDocError(error.message ?? "doc error occured");
    }
  };

  const uploadProofFile = async (file) => {
    setProofLoading(true);
    try {
      const file_upload = await uploadFile(file, gdlAWSConfig);

      if (file_upload) {
        setProofLoading(false);
        setProof(file_upload.location);
      }
    } catch (error) {
      setProofLoading(false);
      toast.error("error occured");
      setProofError(error.message ?? "doc error occured");
    }
  };

  const closeModal = (e) => {
    e.preventDefault();
    props.showModal("HIDE_SUB_MODAL", false);
  };

  const is_disabled =
    !isValid || docloading || proofloading || doc_error || proof_error;

  return (
    <div>
      {/* <HeaderView title="Document" onClose={props.onClose} /> */}
      <div className="pt-8 pb-12 px-12">
        <form className="px-0 w-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="">
            <div className="flex flex-col gap-y-4 text-left pt-3 pb-14 border-b border-gray02">
              <div className="flex flex-col gap-y-1">
                <h3 className="text-primary font-medium text-sm">ID Type</h3>
                <p className="text-sm">
                  Select and upload a government issued valid ID type
                </p>
              </div>
              <div className="flex justify-between gap-x-8 items-center w-full">
                <SelectField
                  item={props.owner_docs}
                  label="ID Type"
                  control={control}
                  selected_item="question"
                  disabled={props.user_doc?.identification_doc}
                  defaultValue={
                    props.user_doc?.identification_doc ?? "Select ID Type"
                  }
                  {...register("identification_doc", {
                    required: props.user_doc?.identification_doc ? false : true,
                  })}
                />
                <TextField
                  label="ID Number"
                  type="text"
                  disabled={props.user_doc?.identification_number}
                  value={props.user_doc?.identification_number}
                  placeholder="Enter ID Number"
                  {...register("identification_number", {
                    required: props.user_doc?.identification_number
                      ? false
                      : true,
                  })}
                />
              </div>
              <>
                <FileField
                  label="Means of Identification"
                  control={control}
                  url={props.user_doc?.identification_doc_url}
                  loading={docloading}
                  uploadFile={uploadDocFile}
                  {...register("identification_doc_url", {
                    required: props.user_doc?.identification_doc_url
                      ? false
                      : true,
                  })}
                />
                {docloading && (
                  <div className="flex items-center gap-3">
                    <LoaderII loading={docloading} />
                    <span>uploading...</span>
                  </div>
                )}
              </>
            </div>
            <div className="flex flex-col text-left gap-y-4 pt-5 pb-14">
              <div className="flex flex-col gap-y-1">
                <h3 className="text-primary font-medium text-sm">
                  Proof of Address
                </h3>
                <p className="text-sm">
                  Upload a clear image of proof of address
                </p>
              </div>
              <SelectField
                item={props.proof_addr}
                label="Document Type"
                control={control}
                selected_item="question"
                defaultValue={
                  props.user_doc?.proof_of_address_doc || "Select One"
                }
                disabled={props.user_doc?.proof_of_address_doc}
                mb="w-1/2"
                {...register("proof_of_address_doc", {
                  required: props.user_doc?.identification_doc_url
                    ? true
                    : false,
                })}
              />
              <>
                <FileField
                  label="Proof of Address"
                  control={control}
                  url={props.user_doc?.proof_of_address_url}
                  loading={proofloading}
                  uploadFile={uploadProofFile}
                  {...register("proof_of_address_url", {
                    required: is_proof_selected != null,
                  })}
                />
                {proofloading && (
                  <div className="flex items-center gap-3">
                    <LoaderII loading={proofloading} />
                    <span>uploading...</span>
                  </div>
                )}
              </>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-brand01 text-sm underline">Reset</span>
            <div className="flex gap-x-8 items-center">
              {/* {JSON.stringify(!formState.isValid || docloading || proofloading)} */}
              <AppButton
                name="Cancel"
                onPress={closeModal}
                variant={"outline"}
              />
              <AppButton
                name="Submit"
                disabled={is_disabled}
                loading={props.loading}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  open: state.ui.modal.show,
  open_sub: state.ui.modal.show_sub_modal,
  loading: state.user.set_docs.loading,
  token: state.auth.login.token,
  owner_docs: state.user.owner_docs.data,
  user_info: state.auth.login.data,
  user_doc: state.user.user_docs.data,
  proof_addr: state.user.owner_docs.proofs,
  set_docs_msg: state.user.set_docs.data,
  user_wallet: state.account.get_wallets.data,
});

export default connect(mapStateToProps, {
  showModal,
  getAction,
  editAction,
  showMessage,
})(UploadModal);
