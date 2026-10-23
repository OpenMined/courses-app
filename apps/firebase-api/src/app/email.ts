import admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

import {
  discussionLink,
  issuesLink,
  slackLink,
} from '../../../courses/src/content/links';

const template = (title, content) => `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${title}</title>
    <style>
    /* -------------------------------------
        RESPONSIVE AND MOBILE FRIENDLY STYLES
    ------------------------------------- */
    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
            table[class=body] ul,
            table[class=body] ol,
            table[class=body] td,
            table[class=body] span,
            table[class=body] a {
        font-size: 16px !important;
      }
      table[class=body] .wrapper,
            table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
      table[class=body] .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
    }

    /* -------------------------------------
        PRESERVE THESE STYLES IN THE HEAD
    ------------------------------------- */
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
      .btn-primary table td:hover {
        background-color: #34495e !important;
      }
      .btn-primary a:hover {
        background-color: #34495e !important;
        border-color: #34495e !important;
      }
    }
    </style>
  </head>
  <body class="" style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f6f6f6;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;">
          <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
            <table class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #ffffff; border-radius: 3px;">
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                        ${content
                          .map(({ type, ...item }) => {
                            if (type === 'title') {
                              return `<p style="font-family: sans-serif; font-size: 18px; font-weight: bold; margin: 0; margin-bottom: 15px;">${item.text}</p>`;
                            } else if (type === 'paragraph') {
                              return `<p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">${item.text}</p>`;
                            } else if (type === 'button') {
                              return `<table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                                <tbody>
                                  <tr>
                                    <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;">
                                      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                                        <tbody>
                                          <tr>
                                            <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; background-color: #3498db; border-radius: 5px; text-align: center;"> <a href="${item.link}" target="_blank" style="display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize; border-color: #3498db;">${item.text}</a> </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>`;
                            } else if (type === 'image') {
                              return `<img src="${item.src}" alt="${item.alt}" width="${item.width}" height="${item.height}" border="0" style="border:0; outline:none; text-decoration:none; display:block; margin-bottom: 15px;">`;
                            }

                            return '';
                          })
                          .join('')}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                <tr>
                  <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; font-size: 12px; color: #999999; text-align: center;">
                    <span class="apple-link" style="color: #999999; font-size: 12px; text-align: center;">This automated email was sent to you by OpenMined</span>
                    <br> Don't like these emails? <a href="https://courses.openmined.org/users/settings" style="text-decoration: underline; color: #999999; font-size: 12px; text-align: center;">Modify your Notification Preferences</a>.
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`;

const contentTitles = {
  createAccount: 'Welcome to OpenMined Courses!',
  deleteAccount: 'We are sorry to see you go...',
  startCourse: 'Congrats on starting an OpenMined Course!',
  receivePassedReview: 'OpenMined Courses - Passed Review',
  receiveFailedReview: 'OpenMined Courses - Failed Review',
};

const contentTypes = {
  createAccount: () => ({
    subject: contentTitles.createAccount,
    text: `We are thrilled to welcome you to OpenMined Courses - the educational platform for the OpenMined community. We suggest that you get started by checking out what courses we currently offer: https://courses.openmined.org/courses. As always, if you run into any issues you can contact us on Slack (${slackLink}), pick up the conversation on our Discussion Board (${discussionLink}), or file a bug report (${issuesLink}).`,
    html: template(contentTitles.createAccount, [
      {
        type: 'image',
        src: 'https://tinyimg.io/i/TecCbAu.png',
        alt: 'OpenMined Courses',
        width: 302,
        height: 30,
      },
      {
        type: 'image',
        src:
          'https://emojis.slackmojis.com/emojis/images/1584726375/8272/blob-cool.gif?1584726375',
        alt: 'Emoji',
        width: 80,
        height: 80,
      },
      {
        type: 'title',
        text: contentTitles.createAccount,
      },
      {
        type: 'paragraph',
        text: `We are thrilled to welcome you to OpenMined Courses - the educational platform for the OpenMined community. We suggest that you get started by checking out <a href="https://courses.openmined.org/courses" target="_blank">what courses we currently offer</a>. As always, if you run into any issues you can contact us on <a href="${slackLink}" target="_blank">Slack</a>, pick up the conversation on our <a href="${discussionLink}" target="_blank">Discussion Board</a>, or file a <a href="${issuesLink}" target="_blank">bug report</a>.`,
      },
      {
        type: 'button',
        text: 'Browse Courses',
        link: 'https://courses.openmined.org/courses',
      },
    ]),
  }),
  deleteAccount: () => ({
    subject: contentTitles.deleteAccount,
    text: `You have requested that your OpenMined Courses account be deleted and the process is currently underway. If you have a moment, we would love to hear your feedback about why you decided to delete your account - please post about it on our Discussion Board: ${discussionLink}.`,
    html: template(contentTitles.deleteAccount, [
      {
        type: 'image',
        src: 'https://tinyimg.io/i/TecCbAu.png',
        alt: 'OpenMined Courses',
        width: 302,
        height: 30,
      },
      {
        type: 'image',
        src:
          'https://emojis.slackmojis.com/emojis/images/1531847665/4238/blob-heartbreak.gif?1531847665',
        alt: 'Emoji',
        width: 80,
        height: 80,
      },
      {
        type: 'title',
        text: contentTitles.deleteAccount,
      },
      {
        type: 'paragraph',
        text: `You have requested that your OpenMined Courses account be deleted and the process is currently underway. If you have a moment, we would love to hear your feedback about why you decided to delete your account - please post something on our <a href="${discussionLink}" target="_blank">Discussion Board</a>.`,
      },
    ]),
  }),
  startCourse: () => ({
    subject: contentTitles.startCourse,
    text: `Congratulations on starting a new course with OpenMined Courses - we wish you the best of luck! If at any point you need help, pick up the conversation on our Discussion Board (${discussionLink}). And as always, if you run into any issues you can contact us on Slack (${slackLink}) or file a bug report (${issuesLink}).`,
    html: template(contentTitles.startCourse, [
      {
        type: 'image',
        src: 'https://tinyimg.io/i/TecCbAu.png',
        alt: 'OpenMined Courses',
        width: 302,
        height: 30,
      },
      {
        type: 'image',
        src:
          'https://emojis.slackmojis.com/emojis/images/1572027736/6827/blob_aww.png?1572027736',
        alt: 'Emoji',
        width: 80,
        height: 80,
      },
      {
        type: 'title',
        text: contentTitles.startCourse,
      },
      {
        type: 'paragraph',
        text: `Congratulations on starting a new course with OpenMined Courses - we wish you the best of luck! If at any point you need help, pick up the conversation on our <a href="${discussionLink}" target="_blank">Discussion Board</a>. And as always, if you run into any issues you can contact us on <a href="${slackLink}" target="_blank">Slack</a> or file a <a href="${issuesLink}" target="_blank">bug report</a>.`,
      },
    ]),
  }),
  receivePassedReview: ({ data }) => ({
    subject: contentTitles.receivePassedReview,
    text: `It looks like you passed your latest project submission - congratulations! If you would like to check out the feedback the mentor gave to you, follow this link: https://courses.openmined.org/courses/${data.course}/project/${data.part}/${data.attempt}.`,
    html: template(contentTitles.receivePassedReview, [
      {
        type: 'image',
        src: 'https://tinyimg.io/i/TecCbAu.png',
        alt: 'OpenMined Courses',
        width: 302,
        height: 30,
      },
      {
        type: 'image',
        src:
          'https://emojis.slackmojis.com/emojis/images/1584726180/8270/blob-dance.gif?1584726180',
        alt: 'Emoji',
        width: 80,
        height: 80,
      },
      {
        type: 'title',
        text: contentTitles.receivePassedReview,
      },
      {
        type: 'paragraph',
        text: `It looks like you passed your latest project submission - congratulations! If you would like to check out the feedback the mentor gave to you, click the link below:`,
      },
      {
        type: 'button',
        text: 'View Feedback',
        link: `https://courses.openmined.org/courses/${data.course}/project/${data.part}/${data.attempt}`,
      },
    ]),
  }),
  receiveFailedReview: ({ data }) => ({
    subject: contentTitles.receiveFailedReview,
    text: `Unfortunately, it looks like you failed your latest project submission. If you would like to check out the feedback the mentor gave to you, follow this link: https://courses.openmined.org/courses/${data.course}/project/${data.part}/${data.attempt}.`,
    html: template(contentTitles.receiveFailedReview, [
      {
        type: 'image',
        src: 'https://tinyimg.io/i/TecCbAu.png',
        alt: 'OpenMined Courses',
        width: 302,
        height: 30,
      },
      {
        type: 'image',
        src:
          'https://emojis.slackmojis.com/emojis/images/1531847584/4234/blob-eyeroll.gif?1531847584',
        alt: 'Emoji',
        width: 80,
        height: 80,
      },
      {
        type: 'title',
        text: contentTitles.receiveFailedReview,
      },
      {
        type: 'paragraph',
        text: `Unfortunately, it looks like you failed your latest project submission. If you would like to check out the feedback the mentor gave to you, click the link below:`,
      },
      {
        type: 'button',
        text: 'View Feedback',
        link: `https://courses.openmined.org/courses/${data.course}/project/${data.part}/${data.attempt}`,
      },
    ]),
  }),
};

// Functions that send email must list this secret in runWith({ secrets }).
export const EMAIL_SECRETS = ['RESEND_API_KEY'];

// Only email addresses we know belong to someone: verified ones, or ones that
// came from an OAuth provider (GitHub, Google). Bot sign-ups with made-up
// addresses would otherwise bounce and hurt openmined.org's sender reputation.
export const hasTrustedEmail = (user: admin.auth.UserRecord) =>
  !!user.email &&
  (user.emailVerified ||
    user.providerData.some((p) => p.providerId !== 'password'));

export const sendEmailIfTrusted = (
  type: string,
  user: admin.auth.UserRecord,
  data: any
) => {
  if (!hasTrustedEmail(user)) {
    logger.info(`Skipped "${type}" email: unverified address`, {
      uid: user.uid,
    });
    return null;
  }
  return sendEmail(type, user.email, data);
};

export const sendEmail = async (type: string, user: string, data: any) => {
  try {
    // Resend's SMTP relay: the username is always "resend", the password is the API key.
    const transporter = await nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });

    await transporter.sendMail({
      from: '"OpenMined" <no-reply@openmined.org>',
      replyTo: 'info@openmined.org',
      to: user,
      ...contentTypes[type](data),
    });

    return { success: true };
  } catch (error) {
    logger.error('Problem sending email', error);
    return { error };
  }
};
