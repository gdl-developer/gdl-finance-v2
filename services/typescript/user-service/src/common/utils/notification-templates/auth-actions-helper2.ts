import { AuthRequestType } from 'src/user/auth/entities/auth.entity';

export const auth_actions_html = (data: any) => {
  // const logo = ``;
  // const heading_logo = data.heading_logo;
  let top_text = '';
  const heading = data.heading;
  const message1 = data.message1;
  const message2 = data.message2;
  const message3 = data.message3;
  // const cta = data.cta;
  // const url = data.url;
  let cta_type = '';
  const text_cta = `<td align="center" style="padding:0;Margin:0;padding-bottom:10px"><h2 style="Margin:0;line-height:46px;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-size:46px;font-style:normal;font-weight:bold;color:#333333">${data.request_otp}</h2></td>`;

  if (data.type === AuthRequestType.EMAIL_VERIFY) {
    cta_type = text_cta;
    top_text = 'Email Verification';
  } else {
    cta_type = text_cta;
  }

  return `<body data-new-gr-c-s-loaded="14.1086.0"
  style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
  <div class="es-wrapper-color" style="background-color:#FAFAFA">
    <!--[if gte mso 9]><v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"> <v:fill type="tile" color="#fafafa"></v:fill> </v:background><![endif]-->
    <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0"
      style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#FAFAFA">
      <tr>
        <td valign="top" style="padding:0;Margin:0">
          <table class="es-header" cellspacing="0" cellpadding="0" align="center"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
            <tr>
              <td align="center" style="padding:0;Margin:0">
                <table class="es-header-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center"
                  style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px">
                  <tr>
                    <td align="left"
                      style="Margin:0;padding-bottom:10px;padding-top:15px;padding-left:20px;padding-right:20px">
                      <!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:194px"><![endif]-->
                      <table class="es-left" cellspacing="0" cellpadding="0" align="left"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                        <tr>
                          <td class="es-m-p0r es-m-p20b" align="center" style="padding:0;Margin:0;width:174px">
                            <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
                              style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td class="es-m-p0r es-m-p0t es-m-txt-c" align="left"
                                  style="padding:0;Margin:0;padding-top:15px">
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">
                                    ${top_text}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td class="es-hidden" style="padding:0;Margin:0;width:20px"></td>
                        </tr>
                      </table>
                      <!--[if mso]></td><td style="width:173px"><![endif]-->
                      <table class="es-left" cellspacing="0" cellpadding="0" align="left"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                        <tr>
                          <td class="es-m-p20b" align="center" style="padding:0;Margin:0;width:173px">
                            <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
                              style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td class="es-m-p0l" align="center" style="padding:0;Margin:0;font-size:0px"><img
                                    src="https://utdcco.stripocdn.email/content/guids/CABINET_7368d65c5e219f35c737e0ccbfaeca34/images/gdl_logo_1.jpeg"
                                    alt width="68"
                                    style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"
                                    height="49"></td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <table class="es-right" cellspacing="0" cellpadding="0" align="right"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                        <tr>
                          <td align="center" style="padding:0;Margin:0;width:173px">
                            <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
                              style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td class="es-m-txt-c" align="right" style="padding:0;Margin:0;padding-top:10px">
                                  <table class="es-table-not-adapt es-social" cellspacing="0" cellpadding="0"
                                    role="presentation"
                                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr>
                                      <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img
                                          title="Twitter"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/twitter-logo-black.png"
                                          alt="Tw" width="24" height="24"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img
                                          title="Facebook"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/facebook-logo-black.png"
                                          alt="Fb" width="24" height="24"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img
                                          title="Pinterest"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/pinterest-logo-black.png"
                                          alt="P" width="24" height="24"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td valign="top" align="center" style="padding:0;Margin:0"><img title="Google+"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/google-plus-logo-black.png"
                                          alt="G+" width="24" height="24"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <!--[if mso]></td></tr></table><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table class="es-content" cellspacing="0" cellpadding="0" align="center"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
            <tr>
              <td align="center" style="padding:0;Margin:0">
                <table class="es-content-body"
                  style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;border-top:10px solid #990000;width:600px;border-bottom:10px solid #990000"
                  cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
                  <tr>
                    <td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:20px;padding-right:20px">
                      <table width="100%" cellspacing="0" cellpadding="0"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr>
                          <td valign="top" align="center" style="padding:0;Margin:0;width:560px">
                            <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
                              style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td class="es-m-txt-l" align="left"
                                  style="padding:0;Margin:0;padding-top:5px;padding-bottom:10px">
                                  <h3
                                    style="Margin:0;line-height:24px;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-size:20px;font-style:normal;font-weight:bold;color:#990000">
                                    <span
                                      style="font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif"> ${heading} </span>.</h3>
                                </td>
                              </tr>
                              <tr>
                                <td align="left" style="padding:0;Margin:0;padding-top:5px;padding-bottom:10px">
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#333333;font-size:18px">
                                    <br>${message1}<br><br></p>
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#333333;font-size:18px">
                                    ${message2} <br><br></p>
                                  <h3
                                    style="Margin:0;line-height:22px;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-style:normal;font-weight:bold;color:#333333">
                                    ${cta_type} </h3>
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'open sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#333333;font-size:18px">
                                    ${message3} </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" class="es-footer" align="center"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
            <tr>
              <td align="center" style="padding:0;Margin:0">
                <table class="es-footer-body" align="center" cellpadding="0" cellspacing="0"
                  style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px">
                  <tr>
                    <td align="left"
                      style="Margin:0;padding-top:20px;padding-bottom:20px;padding-left:20px;padding-right:20px">
                      <table cellpadding="0" cellspacing="0" width="100%"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                        <tr>
                          <td align="left" style="padding:0;Margin:0;width:560px">
                            <table cellpadding="0" cellspacing="0" width="100%" role="presentation"
                              style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                              <tr>
                                <td align="center"
                                  style="padding:0;Margin:0;padding-top:15px;padding-bottom:15px;font-size:0">
                                  <table cellpadding="0" cellspacing="0" class="es-table-not-adapt es-social"
                                    role="presentation"
                                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr>
                                      <td align="center" valign="top" style="padding:0;Margin:0;padding-right:40px"><img
                                          title="Facebook"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/facebook-logo-black.png"
                                          alt="Fb" width="32" height="32"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td align="center" valign="top" style="padding:0;Margin:0;padding-right:40px"><img
                                          title="Twitter"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/twitter-logo-black.png"
                                          alt="Tw" width="32" height="32"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td align="center" valign="top" style="padding:0;Margin:0;padding-right:40px"><img
                                          title="Instagram"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/instagram-logo-black.png"
                                          alt="Inst" width="32" height="32"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                      <td align="center" valign="top" style="padding:0;Margin:0"><img title="Youtube"
                                          src="https://utdcco.stripocdn.email/content/assets/img/social-icons/logo-black/youtube-logo-black.png"
                                          alt="Yt" width="32" height="32"
                                          style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding:0;Margin:0;padding-bottom:35px">
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">
                                    GDL © 2022&nbsp;Growth &amp; Development Ltd. All Rights Reserved.</p>
                                  <p
                                    style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">
                                    Lagos Office : No 1, Afolabi Lesi Street, Ilupeju, Lagos.<br>Abuja Office : St James
                                    House (2nd floor), Plot 1109/No. 167<br>Cadastral ZoneA08 Ademola Adetokunbo
                                    Crescent,<br>Wuse ll, Abuja- Nigeria</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:0;Margin:0">
                                  <table cellpadding="0" cellspacing="0" width="100%" class="es-menu"
                                    role="presentation"
                                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                                    <tr class="links">
                                      <td align="center" valign="top" width="33.33%"
                                        style="Margin:0;padding-left:5px;padding-right:5px;padding-top:5px;padding-bottom:5px;border:0">
                                        <a target="_blank" href=""
                                          style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;display:block;font-family:arial, 'helvetica neue', helvetica, sans-serif;color:#999999;font-size:12px">Visit
                                          Us </a></td>
                                      <td align="center" valign="top" width="33.33%"
                                        style="Margin:0;padding-left:5px;padding-right:5px;padding-top:5px;padding-bottom:5px;border:0;border-left:1px solid #cccccc">
                                        <a target="_blank" href=""
                                          style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;display:block;font-family:arial, 'helvetica neue', helvetica, sans-serif;color:#999999;font-size:12px">Privacy
                                          Policy</a></td>
                                      <td align="center" valign="top" width="33.33%"
                                        style="Margin:0;padding-left:5px;padding-right:5px;padding-top:5px;padding-bottom:5px;border:0;border-left:1px solid #cccccc">
                                        <a target="_blank" href=""
                                          style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:none;display:block;font-family:arial, 'helvetica neue', helvetica, sans-serif;color:#999999;font-size:12px">Terms
                                          of Use</a></td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>`;
};
