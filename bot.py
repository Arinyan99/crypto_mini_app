import telebot

bot = telebot.TeleBot("8513936915:AAG0Jw8hdbX6TwTqduCUNc9PVUZOtTjpbBU")

@bot.message_handler(commands=['start'])
def start(message):
    bot.send_message(message.chat.id, "Приветствую в крипто-боте!")

bot.polling()

