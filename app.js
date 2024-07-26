import bolt from "@slack/bolt";
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const {App} = bolt;
const CHANNEL = process.env.CHANNEL_ID;
const EMAIL_BOT_ID = process.env.TARGET_BOT_ID;
const SUBTYPE = process.env.SUBTYPE;

const CLUB_READY_API_URL = process.env.CLUB_READY_URL;
const CLUB_READY_API_KEY = process.env.CLUB_READY_API_KEY;

const EMAIL = "Email: ";
const NAME = "Name: ";
const PHONE = "Phone Number: "
const NOT_FOUND = -1;
const STORE_ID = process.env.STORE_ID;

console.log(process.env.SOCKET_TOKEN);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SOCKET_TOKEN,
  socketMode: true,
});

(async () => {
    await app.start();
    console.log('⚡️ Bolt app started');
  })();

app.event('message', async ({ event, client, context }) => {
 
    if (!isEmailBotMessage(event)) { 
        return;
    }

    console.log("got email message for prospect :)");

    var text = event.files[0].plain_text;

    if (null == text) {
        console.error("No text in form submission!")

        return;
    }

    var parsedText = null;
    try {
    
        parsedText = parseText(text);
    }
    catch (error) {
        console.error("Error parsing text " + error);
      }

    console.log(parsedText);

    if (null === parsedText) {
        console.error("text parsed from email bot message is null");

        return;
    }

    sendProspectToClubReady(parsedText);
})

async function sendProspectToClubReady(prospect) {

    // axios.get(CLUB_READY_API_URL, {}, {headers: { "Content-Type": "application/json; charset=UTF-8" }},
    //     {params: {
    //         ApiKey: CLUB_READY_API_KEY,
    //         StoreId: STORE_ID}} 
    // )
    // .then(response => console.log(response));

    var body = {
        ApiKey: CLUB_READY_API_KEY,
        StoreId: STORE_ID,
        FirstName: prospect.firstName,
        LastName: prospect.lastName,
        Email: prospect.Email,
        Phone: prospect.Cellphone,
        SendEmail: true
      };

      console.log(body);
      console.log(CLUB_READY_API_URL);

      axios({method: 'post',
        url: CLUB_READY_API_URL,
        data: body
      }).then(response => console.log(response));
}

function parseText(text) {
    // Name: Test DONT ADD ME Email: TESTTEST@yahoo.com Phone Number: 9041231234

    var firstNameStart = text.substring(text.indexOf(NAME) + NAME.length);

    var firstNameEnd = firstNameStart.indexOf(" ");
    var firstName = firstNameStart.substring(0, firstNameEnd);

    var lastNameStart = firstNameStart.substring(firstNameEnd, text.indexOf(" " + EMAIL));
    var lastNameEnd = lastNameStart.indexOf(EMAIL);
    var lastName = lastNameStart.substring(0, lastNameEnd).trim();

    var emailStart = text.substring(text.indexOf(EMAIL) + EMAIL.length);
    var emailEnd = emailStart.indexOf(PHONE);
    var email = emailStart.substring(0, emailEnd).trim();

    var phoneStart = text.substring(text.indexOf(PHONE) + PHONE.length);
    var phoneEnd = phoneStart.indexOf(" ");
    var phone = phoneStart.substring(0, phoneEnd).trim();

    return {APIKey: CLUB_READY_API_KEY, firstName: firstName, lastName: lastName, Gender: "U", PromotionalSMSOptInAnastasiaFitness: 1, WelcomeEmail: 1, Email: email, Cellphone: phone}
}


function isEmailBotMessage(event) {

    if (CHANNEL != event.channel) {
        console.log("wrong chhnl " + event.channel);

        return false;
    }

    if (EMAIL_BOT_ID != event.user) {
        console.log("wrong chhnl type " + event.user);
        
        return false;
    }

    if (SUBTYPE != event.subtype) {
        console.log("wrong sub type " + event.subtype);
        
        return false;
    }

    return true;
}