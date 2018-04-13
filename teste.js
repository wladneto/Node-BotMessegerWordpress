
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , async = require('async')
  , socketio = require('socket.io')
  , bodyParser = require('body-parser')
  , request = require('request')
  , path = require('path');

var app = express();

var messages = [];
var sockets = [];
var _estados =[];
var logo = 'https://i2.wp.com/www.nos2demochilao.com.br/wp-content/uploads/2017/02/04-e1486690093189.png';

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false}));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/webhook',function (requisicao, resposta) {
  
  if (requisicao.query['hub.mode'] === 'subscribe' && requisicao.query['hub.verify_token'] === 'hfrew98yr97832rh8932hr72') {
   // console.log(requisicao);
  //  console.log('validação OK!');
    resposta.status(200).send(requisicao.query['hub.challenge']);
  
  } 
  else {
  //  console.log(requisicao);
 //   console.log('validação Falhou!');
    resposta.sendStatus(403);
  }
});

app.post('/webhook', function (requisicao,resposta) {

  var data =requisicao.body;
  
  if (data && data.object === 'page') {
    //percorrer todas as entradas
    data.entry.forEach(function (entry){
      var pageID = entry.id;
      var timeOffEvent = entry.time;
      //percorrer todas as mensagens
      entry.messaging.forEach(function (event){
        if (event.message) {
           tratarMensagem(event);
          console.log("tratar mensagem");
        } else {
          //procurando clique de botao
          if (event.postback && event.postback.payload){
            console.log ("Achamos um payload no else. Ele é o", event.postback.payload);
            switch (event.postback.payload) {
              
              //COMECAR
              case 'clicou_comecar':
                
                buscarnomeparamenu (event.sender.id);
              break;
              
              //DESTINOS  
              case 'clicou_destinos':
                 
                 ConsultaContinente (event.sender.id);
              break;
              
              
              // ROTEIROS
              case 'clicou_roteiros':
                
               ConsultarPostRoteiros (event.sender.id);
              break;
              
              // DICAS  
              case 'clicou_dicas':
                
                ConsultarPostDicas(event.sender.id);
                break;
                
              
              default:
                console.log("não tratei esse payload... :(");
            }
          } 
          
        }
        
      });
    });
  resposta.sendStatus(200); //confirmar ao app q recebeu a mensagem (senao ele bloqueia o app)
  } 
});

function tratarMensagem(event){
var senderID = event.sender.id; //quem ta enviando
  var recipientID = event.recipient.id; //de qual página
  var timeOffMessage = event.timestamp; //datahora
  var message = event.message; //mensagem
  
 // console.log("Mensagem recebida do usuário %d pela página %d", senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var attachments = message.attachments;
  
  if (messageText) {
    if (_estados[senderID]){
      switch (_estados[senderID]) {
        case 'Passou_Pelo_Menu':
          
          switch (messageText) {
          case 'Sim':
            
            
            buscarnomeparamenu (senderID);
          break;
          case 'Não':
            
           
            buscarnomeparamenu (senderID);
          break;
          case 'Obrigado':
            
            buscarnomeparamenu (senderID);
            
          break;
         
          default:
            // enviar uma mensagem padrao (nao entendi)
            console.log("aqui ta dentro do tratar mensagem");
         
          
          buscarnomeparamenu (senderID);
            
        }
        break;
        
        case 'Passou_Pelos_Continentes':
        if (event.message.quick_reply){
            if (event.message.quick_reply.payload) {
              var continente = event.message.quick_reply.payload;
             // console.log("mandei esse continente:",messageText);
              ConsultaPais (senderID,messageText);
            }
        }else{
              buscarnomeparamenu (senderID);
              }
        break;
        case 'Passou_Pelos_Paises':
        console.log('TO AQUIIIII');
        if (event.message.quick_reply){
                if (event.message.quick_reply.payload) {
                  var idpais = event.message.quick_reply.payload;
                //  console.log("mandei esse id pais:",idpais);
                  ConsultarPostPais (senderID,idpais);
                  
                }
          }else{
          buscarnomeparamenu (senderID);
          }
        
        break;
        

        
        
        
        default:
          
          if (event.message.quick_reply.payload) {
          buscarnomeparamenu (senderID);
          } else{
          buscarnomeparamenu (senderID);
          }
      }
    } else {
        switch (messageText) {
          case 'oi':
            // responder com outro oi
            sendTextMessage(senderID, ';)');
            buscarnomeparamenu (senderID);
          break;
          
          default:  buscarnomeparamenu (senderID);
          
            
        }
      }
     
  }
  
  
}
  
  


//prepara a estrutura da mensagem p enviar
function sendTextMessage (recipientID, messageText) {
  var messageData = {
    recipient: {id: recipientID},
    message: {text: messageText}
  };
callSendAPI(messageData);
}

//funcao para pegar o nome do individuo
function buscarnomeparamenu (recipientID){
  console.log("ENTROU NA FUNCAO BUSCAR NOME PARA MENU");
  var usuario = "https://graph.facebook.com/v2.6/"+recipientID+"?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=EAADxN9Ln58IBAEk58AA20MKp9arryPHyvVFxr5gVkN0sQJXZCmGYKl9JU0B3OJIddTxnEgRiJp6CnCDlhZCFokt0R0iaK6jD6kTinKXmDlKlOdkni1nZAnpY2LiWyaBMseoyRZBt4jYmBNS1288PZBoSG9RNO1buaPTuV42qALAZDZD";    
  
  
  request({
    uri: usuario
     
    }, function (error, respose, body) {
      if (!error && respose.statusCode == 200){
       // console.log ('Mensagem enviada com sucesso ao Face!');
        //var recipientID = body.recipient_id; //guardar em banco no futuro
        //var messageID = body.message_id; // guardar em banco no futuro
        console.log (respose.body);
        var obj = JSON.parse(body);
        
        sendFirstMenu(recipientID,obj.first_name);
      
        
      } else {
        console.log (respose.statusCode);
        console.log (respose.body);
        console.log ('Erro ao enviar para o Face :(');
        sendFirstMenu(recipientID,":)");
      }
  });
  
console.log("SAIU NA FUNCAO BUSCAR NOME PARA MENU");
} 
  





//funcao p mandar menu principal
function sendFirstMenu (recipientID,nomedousuario){
  

  var messageData = {
    recipient: {id: recipientID},
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type:"button",
          text: "Olá "+nomedousuario+"! Clique em uma opção ⬇",
          buttons: [
            { 
            type:"postback",
            title: "Destinos",
            payload: "clicou_destinos"
            },
            { 
            type:"postback",
            title: "Dicas",
            payload: "clicou_dicas"
            },
            { 
            type:"postback",
            title: "Roteiros Prontos",
            payload: "clicou_roteiros"
            }
            
            
         
        
           
            
           
          ]
        }
        
      } 
      
    }
  };
callSendAPI(messageData);
}

function sendContinentesMenu (recipientID,continentes_nome,continentes_id){
  console.log("ENTROU NA FUNCAO SEND CONTINENTES MENU");
  var quantidade = continentes_nome.length;
 // console.log("Vieram "+quantidade+" regioes")
  var texto;
  var dinamico ='';
  if (quantidade >= 11) {
    //preencher vetor com 11 botoes no máximo limitacao do facebook"
    quantidade = 10;
   // console.log("a quantidade alterada é", quantidade);
  }else {
  //  console.log("a quantidade é", quantidade);
  }
  
  var x;
  for (x=0; x<10; x++){
      texto = '{content_type:"text", title:"'+ continentes_nome[x] +'", payload:"'+continentes_id[x]+'"}';
      if (x == quantidade) break;
      dinamico = dinamico + ',' + texto; 
      
  }
  
// retirar a primeira virgula
  dinamico = dinamico.slice(1);
      
  
  //console.log("o texto dinamico foi",dinamico);
  
  var partes = [];
  partes[0] = '[';
  partes[1] = dinamico;
  partes[2]= ']';
  
  var opcoes = partes[0]+partes[1]+partes[2];
 
  
  
  
  var messageData = {
    recipient: {id: recipientID},
    message: {
      
      text:"Escolha uma opção da lista de regiões disponíveis. :)",
      quick_replies: opcoes  } 
      
    
  };
      
//console.log(messageData);
       
_estados[recipientID]='Passou_Pelos_Continentes';

callSendAPI(messageData);
console.log("SAIU DA FUNCAO SEND CONTINENTES MENU");
}


function sendPaisesMenu (recipientID,paises_nome,paises_id,continente){
  console.log("ENTROU NA FUNCAO SEND PAISES MENU");
  var quantidade = paises_nome.length;
  //console.log("Vieram "+quantidade+" paises")
  var texto;
  var dinamico ='';
  if (quantidade >= 11) {
    //preencher vetor com 11 botoes no máximo limitacao do facebook"
    quantidade = 10;
  //  console.log("a quantidade é", quantidade);
  }else {
 //   console.log("a quantidade é", quantidade);
  }
  
  var x = 0;
  for (x=0; x<=10; x++){
      texto = '{content_type:"text", title:"'+ paises_nome[x] +'", payload:"'+paises_id[x]+'"}';
      if (x == quantidade) break;
      dinamico = dinamico + ',' + texto; 
  }
  
// retirar a primeira virgula
  dinamico = dinamico.slice(1);
      
  
  //console.log("o texto dinamico foi",dinamico);
  
  var partes = [];
  partes[0] = '[';
  partes[1] = dinamico;
 // partes[2] = ',{content_type:"text", title:"Outros", payload:"00000000"}';
  partes[3]= ']';
  
  var opcoes = partes[0]+partes[1]+partes[3];
 
  
  
  
  var messageData = {
    recipient: {id: recipientID},
    message: {
      text:"Agora selecione um país da "+continente+".",
      quick_replies: opcoes  } 
      
    
  };
//console.log(messageData);
_estados[recipientID]='Passou_Pelos_Paises';
callSendAPI(messageData);
console.log("SAIU DA FUNCAO SEND PAISES MENU");
}


//recebo um objeto com os posts e coloco no padrão do messenger
function sendPaisesPosts(recipientID,titulo,imagem,url,pais) {
console.log("ENTROU NA FUNCAO SEND PAISES POSTS");
console.log("Os titulos sao:",titulo);
var quantidade = titulo.length;
  console.log("Vieram "+quantidade+" posts");
  var texto;
  var dinamico ='';
  if (quantidade >= 11) {
    //preencher vetor com 11 botoes no máximo limitacao do facebook"
    quantidade = 10;
    console.log("a quantidade é", quantidade);
  }else {
    console.log("a quantidade é", quantidade);
  }
  
  var x = 0;
  for (x=0; x<=10; x++){
      texto = '{title:"'+titulo[x]+'",subtitle:"      ", item_url:"'+url[x]+'",image_url:"'+imagem[x]+'", buttons:[{type: "web_url",url: "'+url[x]+'",title: "Ler este artigo"}]}';
      if (x == quantidade) break;
      dinamico = dinamico + ',' + texto; 
  }
  
// retirar a primeira virgula
  dinamico = dinamico.slice(1);
      
  
  //console.log("o texto dinamico foi",dinamico);
  
  var partes = [];
  partes[0] = '[';
  partes[1] = dinamico;
  partes[2] = ',{title:"Mais posts",subtitle:"Com a mochila nas costas e os pés no infinito...✈", item_url:"www.nos2demochilao.com.br/listing-item/",image_url:"'+logo+'", buttons:[{type: "web_url",url:"http://www.nos2demochilao.com.br/listing-item/",title: "Nos2 de Mochilão"},{type: "web_url",url:"http://www.nos2demochilao.com.br/fale-conosco/",title: "Fale Conosco"}]}';
  partes[3]= ']';
  
  var posts = partes[0]+partes[1]+partes[2]+partes[3];
 
  
  
  
  var messageData = {
    recipient: {id: recipientID},
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: posts
          
        }
      }
    } 
      
    
  };
   
//console.log(messageData);
_estados[recipientID]= null; //to zerando o contexto
callSendAPI(messageData);
console.log("SAIU DA FUNCAO SEND PAISES POSTS");
}

//recebo um objeto com os posts e coloco no padrão do messenger
function sendRoteirosPosts(recipientID,titulo,imagem,url,url_pronta) {
console.log("ENTROU NA FUNCAO SEND ROTEIROS POSTS");
console.log("Os titulos sao:",titulo);
var quantidade = titulo.length;
  console.log("Vieram "+quantidade+" posts");
  var texto;
  var dinamico ='';
  if (quantidade >= 11) {
    //preencher vetor com 11 botoes no máximo limitacao do facebook"
    quantidade = 10;
    console.log("a quantidade é", quantidade);
  }else {
    console.log("a quantidade é", quantidade);
  }
  
  var x = 0;
  for (x=0; x<=10; x++){
      texto = '{title:"'+titulo[x]+'",subtitle:"      ", item_url:"'+url[x]+'",image_url:"'+imagem[x]+'", buttons:[{type: "web_url",url: "'+url[x]+'",title: "Ler este roteiro"},{type: "web_url",url: "'+url_pronta[x]+'",title: "Baixar a Planilha"}]}';
      if (x == quantidade) break;
      dinamico = dinamico + ',' + texto; 
  }
  
// retirar a primeira virgula
  dinamico = dinamico.slice(1);
      
  
  //console.log("o texto dinamico foi",dinamico);
  
  var partes = [];
  partes[0] = '[';
  partes[1] = dinamico;
  partes[2] = ',{title:"Mais roteiros",subtitle:"Com a mochila nas costas e os pés no infinito...✈", item_url:"www.nos2demochilao.com.br/listing-item/",image_url:"'+logo+'", buttons:[{type: "web_url",url:"http://www.nos2demochilao.com.br/roteiros/",title: "Nos2 de Mochilão"},{type: "web_url",url:"http://www.nos2demochilao.com.br/fale-conosco/",title: "Fale Conosco"}]}';
  partes[3]= ']';
  
  var posts = partes[0]+partes[1]+partes[2]+partes[3];
 
  
  
  
  var messageData = {
    recipient: {id: recipientID},
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: posts
          
        }
      }
    } 
      
    
  };
   
//console.log(messageData);
_estados[recipientID]= null; //to zerando o contexto
callSendAPI(messageData);
console.log("SAIU DA FUNCAO SEND ROTEIROS POSTS");
}

//recebo um objeto com os posts e coloco no padrão do messenger
function sendDicasPosts(recipientID,titulo,imagem,url) {
console.log("ENTROU NA FUNCAO SEND DICAS POSTS");
console.log("Os titulos sao:",titulo);
var quantidade = titulo.length;
  console.log("Vieram "+quantidade+" posts");
  var texto;
  var dinamico ='';
  if (quantidade >= 11) {
    //preencher vetor com 11 botoes no máximo limitacao do facebook"
    quantidade = 10;
    console.log("a quantidade é", quantidade);
  }else {
    console.log("a quantidade é", quantidade);
  }
  
  var x = 0;
  for (x=0; x<=10; x++){
      texto = '{title:"'+titulo[x]+'",subtitle:"      ", item_url:"'+url[x]+'",image_url:"'+imagem[x]+'", buttons:[{type: "web_url",url: "'+url[x]+'",title: "Ler esta dica"}]}';
      if (x == quantidade) break;
      dinamico = dinamico + ',' + texto; 
  }
  
// retirar a primeira virgula
  dinamico = dinamico.slice(1);
      
  
  //console.log("o texto dinamico foi",dinamico);
  
  var partes = [];
  partes[0] = '[';
  partes[1] = dinamico;
  partes[2] = ',{title:"Mais dicas",subtitle:"Com a mochila nas costas e os pés no infinito...✈", item_url:"www.nos2demochilao.com.br/listing-item/",image_url:"'+logo+'", buttons:[{type: "web_url",url:"http://www.nos2demochilao.com.br/roteiros/",title: "Nos2 de Mochilão"},{type: "web_url",url:"http://www.nos2demochilao.com.br/fale-conosco/",title: "Fale Conosco"}]}';
  partes[3]= ']';
  
  var posts = partes[0]+partes[1]+partes[2]+partes[3];
 
  
  
  
  var messageData = {
    recipient: {id: recipientID},
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: posts
          
        }
      }
    } 
      
    
  };
   
//console.log(messageData);
_estados[recipientID]= null; //to zerando o contexto
callSendAPI(messageData);
console.log("SAIU DA FUNCAO SEND ROTEIROS POSTS");
}





//funcao para enviar mensagem ao face
function callSendAPI (messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAADxN9Ln58IBAEk58AA20MKp9arryPHyvVFxr5gVkN0sQJXZCmGYKl9JU0B3OJIddTxnEgRiJp6CnCDlhZCFokt0R0iaK6jD6kTinKXmDlKlOdkni1nZAnpY2LiWyaBMseoyRZBt4jYmBNS1288PZBoSG9RNO1buaPTuV42qALAZDZD' },
    method: 'POST',
    json: messageData 
    }, function (error, respose, body) {
      if (!error && respose.statusCode == 200){
       // console.log ('Mensagem enviada com sucesso ao Face!');
        //var recipientID = body.recipient_id; //guardar em banco no futuro
        //var messageID = body.message_id; // guardar em banco no futuro
      } else {
        console.log (respose.statusCode);
        console.log (respose.body);
        console.log ('Erro ao enviar para o Face :(');
        
      }
  });
} 
// FIM do ROBO

//CONSULTAS NO SITE

function ConsultaContinente (recipientID) {
    console.log('ENTROU NA FUNCAO CONSULTA CONTINENTE');
    var request = require("request");
    
    var options = { method: 'GET',
      url: 'http://www.nos2demochilao.com.br/wp-json/wp/v2/listing-item-location/?per_page=100',
      };
    var continentes_id = [];
    var continentes_nome = [];
    var paises_id = [];
    var paises_nome = [];
    
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
     // console.log(body); //tudao
            
            //virar objeto
            var obj = JSON.parse(body);
            //console.log(obj);
            
            
            var y = 0;
            var z = 0;
            for(var x in obj) {
              
              if (obj[x].parent === 0) { //quem nao tem pai
             // console.log("Item:"+x+", Nome continente:"+obj[x].name); //colocar nas opções
              continentes_nome[y] = obj[x].name;
              continentes_id[y] = obj[x].id; 
              y = y+1;
              }else { //quem  tem pai
                paises_nome[z] = obj[x].name;
                paises_id[z] = obj[x].id;
                z = z+1;
              }
              
            }
             //console.log("mandei para o menu continentes isso:",continentes_nome);
             //console.log("mandei o recipient:",recipientID);
             //console.log("to com esses paises para tratar:", paises_nome);
             console.log('SAIU DA FUNCAO CONSULTA CONTINENTE');
            sendContinentesMenu(recipientID,continentes_nome,continentes_id); 
            
    });
}

function ConsultaPais (recipientID,nomecontinente) {
    console.log('ENTROU NA FUNCAO CONSULTA PAIS');
    var request = require("request");

    var options = { method: 'GET',
      url: 'http://www.nos2demochilao.com.br/wp-json/wp/v2/listing-item-location/?per_page=100',
      };
    var continentes_id = [];
    var paises_id = [];
    var paises_nome = [];
    
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
     // console.log(body); //tudao
            
            //virar objeto
            var obj = JSON.parse(body);
            //console.log(obj);
            //console.log("estou procurando o id do continente",nomecontinente);
            for(var x in obj) {
              
              if (obj[x].name === nomecontinente) { //descobrindo o id nome do continente
              //console.log("Item:"+x+", Nome continente:"+obj[x].name); //
              continentes_id[0] = obj[x].id; 
              
              }else { 
                //nada
              }
            }
            
            //procurar os paises
          //  console.log('estou procurando os paises do continente = ',continentes_id);
            var y = 0;
            x=0;
            for( x in obj) {
              
              if (obj[x].parent === continentes_id[0]) { //quem tem pai igual ao continente recebido
           //   console.log("Item:"+x+", Nome pais:"+obj[x].name); //colocar nas opções
              paises_nome[y] = obj[x].name;
              paises_id[y] = obj[x].id; 
              y = y+1;
              }else { 
                //nada
              }
              
            }
          //   console.log("mandei para o menu paises isso:",paises_nome);
          //   console.log("mandei o recipient:",recipientID);
          console.log('SAIU DA FUNCAO CONSULTA PAIS');
          sendPaisesMenu(recipientID,paises_nome,paises_id,nomecontinente); 
        
    });
}


function ConsultarPostPais (recipientID,id_pais) {
  console.log('ENTROU NA FUNCAO CONSULTA POST PAIS');
    var titulo=[];
    var imagem=[];
    var url=[];
    var saiudaconsulta = false;
    
    var request = require("request");
    var options = { method: 'GET',
          url: 'http://www.nos2demochilao.com.br/wp-json/wp/v2/listing-item/?listing-item-location='+id_pais+'&&per_page=10',
      };
    request(options, function (error, response, body) {
    if (error) throw new Error(error);
    
     //virar objeto
      var obj = JSON.parse(body);
      //pegando os titulos e os ids dos posts
      for(var x in obj) {
          titulo[x] = obj[x].title.rendered;
          url[x] = obj[x].link;
          console.log('to procurando esse id de post',obj[x].id);
          if (obj[x].acf == false) {
            url[x] = 'http://nos2demochilao.com.br';
          imagem[x] = logo;
          }else {
          
          imagem[x] = obj[x].acf.url_segura_da_imagem;
          }
      //  console.log("o que fiz ate agora foi isso - titulos", titulo[x]);
      //  console.log("o que fiz ate agora foi isso - imagens", imagem[x]);
       // console.log("o que fiz ate agora foi isso - urls", url[x]);
      }
      saiudaconsulta = true;// fim dos posts
   }); //fim do request para pegar os posts
          
          
         
/// chamar a opção para enviar os top 5 posts desse pais... enfim... =)
setTimeout(function() {
sendTextMessage(recipientID, 'Ok mochileiro...                            Confira os posts deslizando para esquerda ⬅️ ');
},2000);

// TENHO Q COLOCAR O DIGITANDO AQUI
if (saiudaconsulta == true) {
  sendPaisesPosts(recipientID,titulo,imagem,url,id_pais); 
} else {
setTimeout(function() {
  sendPaisesPosts(recipientID,titulo,imagem,url,id_pais); 
  }, 5000);
}

console.log('SAIU DA FUNCAO CONSULTA POST PAIS');
       
} 

function ConsultarPostRoteiros (recipientID) {
  console.log('ENTROU NA FUNCAO CONSULTA POST ROTEIROS');
    var titulo=[];
    var imagem=[];
    var url=[];
    var urlpronta=[];
    var saiudaconsulta = false;
    
    var request = require("request");
    //chamar apenas os roteiros
    var options = { method: 'GET',
          url: 'http://www.nos2demochilao.com.br/wp-json/wp/v2/posts/?categories=595',
      };
    request(options, function (error, response, body) {
    if (error) throw new Error(error);
    
     //virar objeto
      var obj = JSON.parse(body);
      //pegando os titulos e os ids dos posts
      for(var x in obj) {
          titulo[x] = obj[x].title.rendered;
          url[x] = obj[x].link;
          console.log('to procurando esse id de post',obj[x].id);
          if (obj[x].acf == false) {
            url[x] = 'http://www.nos2demochilao.com.br';
            imagem[x] = logo;
            urlpronta[x] = 'http://www.nos2demochilao.com.br';
          }else {
            imagem[x] = obj[x].acf.url_segura_da_imagem;
            urlpronta[x] = obj[x].acf.url_planilha_pronta;
          }
      
  
      }
      saiudaconsulta = true;// fim dos posts
   }); //fim do request para pegar os posts
          
 




http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
