import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import "./App.css";
import Layout from "./components/Layout/Layout";
import IndexRoute from "./routes/indexRoute";
import AppModal from "./components/Widget/Modal/Modal";
import {
  showMessage,
  logOut,
  showModal,
} from "./store/actions/creators/ui.action";
import MessageBox from "./components/Widget/MessageBox/MessageBox";
import SuccessModal from "./components/Widget/Modal/SuccessModal";
import clsx from "clsx";
import { Helmet } from "react-helmet-async";

const GoogleTagManager = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','GTM-TDRVPJ7C');
    `;
    document.head.appendChild(script);

    // Cleanup
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=GTM-TDRVPJ7C`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
};

const App = ({ show_msg, modal_content, ...props }) => {
  const [leftpage, setLeftpage] = useState(false);

  useEffect(() => {
    handleVisibilityChange();
  }, []);

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      setLeftpage(true);
    }
  };

  return (
    <>
      <Helmet>
        {/** CPS policy */}
        {/* <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" /> */}

        {/** prevent click jacking */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />

        {/** prevent MIME-type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />

        {/** enable XSS protection for older browsers */}
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      </Helmet>
      <GoogleTagManager />
      <Layout>
        <IndexRoute />
      </Layout>
      <AppModal
        open={show_msg}
        no_header
        onClose={() => null}
        className="md:w-[400px]"
        content={props.msg_content || <MessageBox />}
      />
      <AppModal
        open={props.show_success}
        onClose={() => props.showModal("CLOSE_SUCCESS_MODAL")}
        z_index={"z-50"}
        content={<SuccessModal content={props.success_msg} />}
      />
      <AppModal
        title="Testing"
        open={props.open_modal}
        className={clsx("md:w-[600px] md:min-h-[700px] pb-[40px]")}
        onClose={() => props.showModal("CLOSE_MODAL")}
        content={modal_content}
      />
    </>
  );
};

const mapStateToProps = (state) => ({
  show_msg: state.ui.open_msg.msg_modal,
  open_modal: state.ui.new_modal?.show_modal || false,
  modal_content: state.ui.new_modal?.options?.content,
  show_success: state.ui.open_success?.open_success,
  success_msg: state.ui.open_success?.response_msg,
  msg_content: state.ui.open_msg?.content,
  token: state.auth.login.token,
});

export default connect(mapStateToProps, { showMessage, logOut, showModal })(
  App
);
