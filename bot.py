import telebot

bot = telebot.TeleBot("PASTE_YOUR_TOKEN_HERE")

@bot.message_handler(commands=['start'])
def start(message):
    bot.send_message(message.chat.id, "Бот запущен на Render!")

bot.polling()

