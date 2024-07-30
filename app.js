import bolt from "@slack/bolt";
import dotenv from 'dotenv';
import axios from 'axios';
import express from 'express'


dotenv.config();

const {App} = bolt;
const CHANNEL = process.env.CHANNEL_ID;
const EMAIL_BOT_ID = process.env.TARGET_BOT_ID;
const SUBTYPE = process.env.SUBTYPE;
const CHANNEL_HELPER = process.env.CHANNEL_HELPER;

const POST_PROSPECT_URL = process.env.POST_PROSPECT_URL;
const PUT_PROSPECT_URL = process.env.PUT_PROSPECT_URL;

const CLUB_READY_API_KEY = process.env.CLUB_READY_API_KEY;

const EMAIL = "Email: ";
const GET_PROSPECT_QUERY_STRING = process.env.GET_PROSPECT_QUERY_STRING;
const NAME = "Name: ";
const PHONE = "Phone Number: "
const WEB_PROSPECT_TYPE_NUMBER = 56520;
const NOT_FOUND = -1;
const STORE_ID = process.env.STORE_ID;


const port = process.env.PORT || 8080;
const e = express();
e.listen(port); //have to do this for render to not shit itself

console.log(process.env.SOCKET_TOKEN);
console.log(process.env.SLACK_BOT_TOKEN);

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

    var body = {
        ApiKey: CLUB_READY_API_KEY,
        StoreId: STORE_ID,
        FirstName: prospect.firstName,
        LastName: prospect.lastName,
        Email: prospect.Email,
        Phone: prospect.Cellphone,
        SendEmail: true,
        ProspectTypeId: WEB_PROSPECT_TYPE_NUMBER
      };

    console.log(body);
    console.log(POST_PROSPECT_URL);

    axios({method: 'post',
        url: POST_PROSPECT_URL,
        data: body
    }).then(response => {
        //console.log(response);
        console.log(response.data.StatusCode)

   
        makeChatMessage(prospect, response)
        .then(message => {
            app.client.chat.postMessage({
                "channel": CHANNEL,
                "text" : message
                });
        })
    });
}

function buildGetURLString(prospect) {

    var paramList = [CLUB_READY_API_KEY, prospect.firstName, prospect.lastName, STORE_ID, prospect.Email]

    var base = GET_PROSPECT_QUERY_STRING;
    for (var i = 0; i < paramList.length; i++) {

        base = base.replace('{' + i + '}', paramList[i]);
    }

    return base;
}

async function getPreExistingProspect(prospect) {

      var url = buildGetURLString(prospect);

      console.log("get url" + url);

      return axios({method: 'get',
        url: url
      }).then(response => {
      
        console.log(response.data);
        var results = response.data.users;

        if (1 < results.length) {
            return "Multiple registered users with name: " + prospect.firstName + " " + prospect.lastName + " cannot ensure correct prospect has updated prospect type number: " + + WEB_PROSPECT_TYPE_NUMBER + ". <" + CHANNEL_HELPER +  "> please assist.";
        }

        if (0 == results.length) {

            return "Couldn't find a prospect with provided  name: " + prospect.firstName + " " + prospect.lastName;
        }

        var userId = results[0].UserId;

        var body = {
            ApiKey: CLUB_READY_API_KEY,
            StoreId: STORE_ID,
            UserId: userId,
            FirstName: prospect.firstName,
            LastName: prospect.lastName,
            Email: prospect.Email,
            Phone: prospect.Cellphone,
            ProspectTypeId: WEB_PROSPECT_TYPE_NUMBER
          };
        
          var putUrl = PUT_PROSPECT_URL.replace('{0}', userId);
    
        axios({method: 'put',
            url: putUrl,
            data: body
        }).then(r => console.log(r.data.StatusCode)); 

        return "Updated prospect with name: " + prospect.firstName + " " + prospect.lastName + " and email: " + prospect.Email + " to prospect type number: " + WEB_PROSPECT_TYPE_NUMBER;
    })
}

async function makeChatMessage(prospect, response) {

    var success = true;
        if (200 != response.data.StatusCode) {
            success = false;
        } 

    if (!success) {

        if (response.data.Message = 'Prospect already exists') {

            return "Prospect already exists with name: " + prospect.firstName + " " + prospect.lastName + " and email: " + prospect.Email + ". <" + CHANNEL_HELPER +  "> please assist.";
            //return await getPreExistingProspect(prospect);
        }

        return "Unsuccessfully registered prospect: " + prospect.firstName + " " + prospect.lastName + ". <" + CHANNEL_HELPER +  "> please assist.";
    }


    return "Succesfully registered prospect: " + prospect.firstName + " " + prospect.lastName;
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
