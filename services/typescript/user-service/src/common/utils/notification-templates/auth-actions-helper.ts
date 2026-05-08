export const auth_actions_html = (data: any) => {
  const heading = data.heading;
  const message1 = data.message1;
  const message2 = data.message2;
  let cta_type: any;
  const request_otp = data.request_otp;

  // const text_cta_arr = [];

  // if (request_otp) {
  //   const request_otp_arr = getRequestOTPArray(data.request_otp);

  //   for (let i = 0; i < request_otp_arr.length; i++) {
  //     text_cta_arr.push(
  //       `<div style="display: flex; flex: 1; height: 64px; border-radius: 8px; border: 2px solid #9A2333; color: #9A2333; font-size: 36px; font-weight: 500;">&nbsp; &nbsp;${request_otp_arr[i]}&nbsp; &nbsp;</div> &nbsp; &nbsp;`,
  //     );
  //   }
  // }

  const text_cta = ` <tr>
      <td align="left">
        <div style="display: flex; gap: 8px; margin-bottom: 24px;font-family:Outfit; width: 100%; max-width: 450px;">
          <div style=" color: #9A2333; font-size: 36px; font-weight: 500;">${request_otp}</div>
        </div>
      </td>
    </tr>`;

  if (data.type == 'LOGIN') {
    cta_type = ``;
  } else {
    cta_type = text_cta;
  }

  const d = new Date();
  const year = d.getFullYear();

  const app_cta = `Download the app`;
  const app_cta_text = `Get the most of GDL Plus by downloading our app.`;
  const google_store_url = `https://play.google.com/store/apps/details?id=com.gdl_application&hl=en&gl=US`;
  const apple_store_url = `https://apps.apple.com/ng/app/gdl-plus/id6447128737`;
  const rights_reserved = `GDL © ${year} Growth & Development Ltd. All Rights Reserved.`;
  const head_office_address = `1 Afolabi Lesi Street, Ilupeju, Lagos.`;
  const branch_offices_address = `St. James House (2nd floor), Plot 1109/No. 167 Cadastral Zone A08 Ademola Adetokunbo Cresennt, Wuse II, Abuja, Nigeria.`;
  const terms_of_use_url = `https://housemoni.ng/terms-of-use`;
  const privacy_policy_url = `https://housemoni.ng/privacy-policy`;
  const house_moni_url = `https://housemoni.ng`;

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
  
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="telephone=no" name="format-detection">
    <title></title>
    <!--[if (mso 16)]>
      <style type="text/css">
      a {text-decoration: none;}
      </style>
      <![endif]-->
    <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
    <!--[if gte mso 9]>
  <xml>
      <o:OfficeDocumentSettings>
      <o:AllowPNG></o:AllowPNG>
      <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
    <!--[if !mso]><!-- -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!--<![endif]-->
    <!--[if mso]>
   <style type="text/css">
       ul {
    margin: 0 !important;
    }
    ol {
    margin: 0 !important;
    }
    li {
    margin-left: 47px !important;
    }
  
   </style><![endif]
  -->
  </head>
  
  <body class="body">
    <div dir="ltr" class="es-wrapper-color">
      <!--[if gte mso 9]>
        <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
          <v:fill type="tile" color="#f6f6f6"></v:fill>
        </v:background>
      <![endif]-->
      <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
        <tbody>
          <tr>
            <td class="esd-email-paddings" valign="top">
              <table class="es-content" cellspacing="0" cellpadding="0" align="center">
                <tbody>
                  <tr>
                    <td class="esd-stripe" align="center">
                      <table class="es-content-body" style='padding: 20px; max-width: 600px; width: 100%;' cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
                        <tbody style=''>
                          <tr>
                            <td class="esd-structure es-p20" align="left">
                              <table width="100%" cellspacing="0" cellpadding="0">
                                <tbody>
                                  <tr>
                                    <td class="esd-container-frame" width="560" valign="top" align="center">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tbody>
                                          <tr>
                                            <td align="left" class="esd-block-image" style="font-size: 0; padding-block: 24px;">
                                              <a target="_blank">
                                                <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/gdllogo.png" alt="" width="32">
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td class="esd-structure es-p20" align="left">
                              <table width="100%" cellspacing="0" cellpadding="0">
                                <tbody>
                                  <tr>
                                    <td class="esd-container-frame" valign="top" align="center">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tbody>
                                          <tr>
                                            <td align="left" class="esd-block-text es-text-9455 es-p20b">
                                              <h2 style="font-family:Outfit,&#39;helvetica neue&#39;,helvetica,arial,sans-serif;color:#1F2734; font-weight:600; margin-block: 0px;">
                                              ${heading}
                                              </h2>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-text es-text-4052 es-p20b">
                                              <p style="font-family:Outfit,&#39;helvetica neue&#39;,helvetica,arial,sans-serif;color:#666;font-size:16px;line-height:150%;margin-block: 0px;padding-block:24px;">
                                                ${message1}
                                                <br><br>
                                                ${message2}
                                              </p>
                                            </td>
                                          </tr>
                                          ${cta_type}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td class="esd-structure es-p20" align="left">
                              <table width="100%" cellspacing="0" cellpadding="0">
                                <tbody>
                                  <tr>
                                    <td class="esd-container-frame" valign="top" align="center">
                                      <table width="100%" cellspacing="0" cellpadding="0">
                                        <tbody>
                                          <tr>
                                            <td align="center" class="esd-block-spacer" style="font-size: 0">
                                              <table border="0" width="100%" height="100%" cellpadding="0" cellspacing="0" class="es-spacer">
                                                <tbody>
                                                  <tr>
                                                    <td style="border-bottom: 1px solid #cccccc;; background: none; height: 1px; width: 100%; margin: 0px 0px 0px 0px">
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-text es-text-8858 es-p20b">
                                              <h3 style="font-family:Outfit,&#39;helvetica neue&#39;,helvetica,arial,sans-serif;color:#1F2734;font-weight: 500;">
                                                ${app_cta}
                                              </h3>
                                              <p style="font-family:Outfit,&#39;helvetica neue&#39;,helvetica,arial,sans-serif;color:#666666;font-size:12px;line-height:150%">
                                                ${app_cta_text}
                                              </p>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-image" style="font-size: 0">
                                              <div style="display: flex; gap: 6px; ">
                                                <a target="_blank" rel="noopenner" href="${google_store_url}">
                                                  <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/playstore.png" alt="" width="90">
                                                </a> <a target="_blank" rel="noopenner" href="${apple_store_url}">
                                                  <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/appstore.png" alt="" width="90">
                                                </a>
                                              </div>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-text es-text-9984 es-p20b es-p20t">
                                              <p style="font-family:Outfit,&#39;helvetica neue&#39;,helvetica,arial,sans-serif;color:#666;font-size:16px;line-height:150%">
                                                ${rights_reserved}
                                                <br><strong style="color:#1F2734; font-weight:500;">Head Office: </strong>
                                                  ${head_office_address}
                                                <br><strong style="color:#1F2734; font-weight: 500;">Branch:</strong>
                                                  ${branch_offices_address}
                                              </p>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-text es-text-1619">
                                              <div style="color:#666666; display: flex; gap: 16px; padding-bottom: 20px;font-family:Outfit">
                                                <a target="_blank" href="${terms_of_use_url}" style="color:#666666;font-size:12px;line-height:150%" rel="noopenner">Terms</a> &nbsp; &nbsp;
                                                <a target="_blank" rel="noopenner" href="${privacy_policy_url}" style="color:#666666;font-size:12px;line-height:150%">Privacy</a> &nbsp; &nbsp;
                                                <a target="_blank" rel="noopenner" href="${house_moni_url}" style="color:#666666;font-size:12px;line-height:150%">House Moni</a>
                                              </div>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="left" class="esd-block-image" style="font-size: 0">
                                              <div style="display: flex; justify-content: space-between; align-items: center;">

                                                <div style="display: flex; gap: 16px;">
                                                  <a target="_blank" rel="noopenner" href="https://www.facebook.com/GDLAssetManagement/">
                                                    <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/facebook.png" alt="" width="18">
                                                  </a>
                                                  <a target="_blank" rel="noopenner" href="https://www.facebook.com/GDLAssetManagement/">
                                                    <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/instagram.png" alt="" width="18">
                                                  </a>
                                                  <a target="_blank" rel="noopenner">
                                                    <img src="https://ecvhlin.stripocdn.email/content/guids/CABINET_940c170058d0bc80be859615fb7e1dc3f8a1633bf06354d80b1ceefe7fa6a819/images/youtube.png" alt="" width="18">
                                                  </a>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
  
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  
  </body>
  
  </html>
`;
};

// function getRequestOTPArray(request_otp: number) {
//   const request_otp_str = `${request_otp}`;
//   const request_otp_arr = [];

//   for (let i = 0; i < request_otp_str.length; i++) {
//     const otp = parseInt(request_otp_str[i]);
//     request_otp_arr.push(otp);
//   }

//   return request_otp_arr;
// }
