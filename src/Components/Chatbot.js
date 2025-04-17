import React, { useState, useEffect, useRef } from "react";
import "./Styles/Chatbot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi there! I'm your Eyecraft Security assistant. I can help you learn about our services or book security guards. How can I help you today?", sender: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    numGuards: "",
    durationType: "hours",
    durationValue: "",
    cameraRequired: false,
    vehicleRequired: false,
    firstAid: false,
    walkieTalkie: false,
    bulletProof: false,
    fireSafety: false,
    message: "",
  });
  const [currentField, setCurrentField] = useState(null);
  const [isCollectingData, setIsCollectingData] = useState(false);
  const [cost, setCost] = useState(0);
  const [processingInput, setProcessingInput] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Available services
  const services = [
    "Club Guards", 
    "Event Security", 
    "Personal Security", 
    "Property Guards", 
    "Corporate Security",
    "Gunmen & Guard Dogs"
  ];

  // Booking intent keywords
  const bookingKeywords = ["book", "hire", "need", "want", "looking for", "require", "get", "how much", "cost", "price", "quote"];

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Calculate cost when form data changes
  useEffect(() => {
    if (formData.numGuards) {
      const baseGuardCost = 1000;
      const serviceCharge = 1000;
      const optionalCosts = {
        cameraRequired: 500,
        vehicleRequired: 2500,
        firstAid: 150,
        walkieTalkie: 500,
        bulletProof: 2000,
        fireSafety: 750,
      };

      let calculatedCost = parseInt(formData.numGuards) * baseGuardCost;
      Object.entries(optionalCosts).forEach(([key, value]) => {
        if (formData[key]) calculatedCost += value;
      });

      calculatedCost += serviceCharge;
      calculatedCost *= 1.18; // GST 18%
      setCost(Math.round(calculatedCost));
    }
  }, [formData]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const addMessage = (text, sender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { text, sender },
    ]);
  };

  const hasBookingIntent = (userInput) => {
    const input = userInput.toLowerCase();
    for (const keyword of bookingKeywords) {
      if (input.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  // Prevent multiple messages from being processed at once
  const processUserInput = async (userInput) => {
    if (processingInput) return;
    setProcessingInput(true);
    
    try {
      if (isCollectingData) {
        await handleFormInput(userInput);
      } else {
        setIsTyping(true);
        
        try {
          // Create context information
          const contextInfo = `The user is inquiring about Eyecraft Security services. Eyecraft Security has been providing reliable security services in Delhi, Noida, Gurgaon, Faridabad, Ghaziabad, Patna, and Muzaffarpur for over 10 years. Services include: Club Guards, Event Security, Personal Security, Property Guards, Corporate Security, Gunmen & Guard Dogs. Eyecraft Security is available 24/7 to offer security services at competitive prices.`;
          
          const response = await fetch("http://localhost:8080/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: userInput,
              context: contextInfo
            }),
          });
          
          const data = await response.json();
          
          // Check if the message has booking intent
          if (hasBookingIntent(userInput)) {
            addMessage(data.response, "bot");
            
            // After a short delay, prompt them to book
            setTimeout(() => {
              addMessage("Would you like to proceed with booking a security service now?", "bot");
              addQuickReplies(["Yes, book now", "No, just inquiring"]);
            }, 1000);
          } else {
            addMessage(data.response, "bot");
            
            // Check if it's a good time to suggest booking
            if (messages.length > 3 && Math.random() > 0.5) {
              setTimeout(() => {
                addMessage("Would you like to learn about our services or would you prefer to book security services?", "bot");
                addQuickReplies(["Tell me about services", "I'd like to book"]);
              }, 1000);
            }
          }
          
        } catch (error) {
          console.error("Error communicating with bot API:", error);
          
          // Fallback response if API fails
          addMessage("I'm here to help with Eyecraft Security services. We offer security solutions in Delhi, Noida, Gurgaon, Faridabad, Ghaziabad, Patna, and Muzaffarpur. Would you like to book a service or learn more about what we offer?", "bot");
          addQuickReplies(["Tell me about services", "I'd like to book"]);
        }
        
        setIsTyping(false);
      }
    } finally {
      setProcessingInput(false);
    }
  };

  const addQuickReplies = (options) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { options, sender: "bot-options" },
    ]);
  };

  const handleQuickReplyClick = (reply) => {
    addMessage(reply, "user");
    
    // Use setTimeout to ensure messages appear in the correct order
    setTimeout(() => {
      if (reply === "Yes, book now" || reply === "I'd like to book") {
        startBookingProcess();
      } else if (reply === "No, just inquiring") {
        addMessage("No problem! Feel free to ask any questions about our security services. Eyecraft Security offers a range of services including Club Guards, Event Security, Personal Security, Property Guards, Corporate Security and more. We serve Delhi, Noida, Gurgaon, Faridabad, Ghaziabad, Patna, and Muzaffarpur.", "bot");
      } else if (reply === "Tell me about services") {
        processUserInput("Tell me about Eyecraft Security services");
      } else if (services.includes(reply)) {
        // Fixed service selection flow
        if (currentField === "service") {
          // If we're in the booking flow, update the form
          updateFormData("service", reply);
          askNextQuestion("numGuards");
        } else {
          // If we're not in booking flow, tell about the service
          processUserInput(`Tell me about your ${reply} service`);
          
          setTimeout(() => {
            addMessage("Would you like to book this service?", "bot");
            addQuickReplies(["Yes, book now", "No, tell me more about other services"]);
          }, 1500);
        }
      } else if (currentField === "durationType") {
        updateFormData("durationType", reply === "Hours" ? "hours" : "months");
        askNextQuestion("cameraRequired");
      } else if (reply.startsWith("Yes") && currentField && currentField.endsWith("Required")) {
        const field = currentField;
        updateFormData(field, true);
        askNextQuestion(getNextField(field));
      } else if (reply.startsWith("No") && currentField && currentField.endsWith("Required")) {
        const field = currentField;
        updateFormData(field, false);
        askNextQuestion(getNextField(field));
      } else if (reply === "Submit booking") {
        submitForm();
      } else if (reply === "Cancel") {
        cancelBooking();
      } else if (reply === "No, tell me more about other services") {
        addMessage("Here are the security services offered by Eyecraft Security:", "bot");
        addQuickReplies(services);
      }
    }, 100);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || processingInput) return;

    addMessage(inputValue, "user");
    processUserInput(inputValue);
    setInputValue("");
  };

  const startBookingProcess = () => {
    setIsCollectingData(true);
    addMessage("Great! Let's book a security service for you. I'll need to collect some information.", "bot");
    
    // Use timeout to ensure messages appear in the correct order
    setTimeout(() => {
      askNextQuestion("name");
    }, 100);
  };

  const cancelBooking = () => {
    setIsCollectingData(false);
    setCurrentField(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      service: "",
      numGuards: "",
      durationType: "hours",
      durationValue: "",
      cameraRequired: false,
      vehicleRequired: false,
      firstAid: false,
      walkieTalkie: false,
      bulletProof: false,
      fireSafety: false,
      message: "",
    });
    addMessage("Booking process cancelled. How else can I help you with Eyecraft Security services?", "bot");
  };

  const handleFormInput = async (input) => {
    if (!currentField) return;

    if (currentField === "service") {
      const matchedService = services.find(
        (service) => service.toLowerCase() === input.toLowerCase()
      );
      
      // More flexible service matching
      const serviceMap = {};
      services.forEach(s => {
        serviceMap[s.toLowerCase()] = s;
      });
      
      // Check if input contains any of our service names
      let serviceMatch = null;
      for (const [key, value] of Object.entries(serviceMap)) {
        if (input.toLowerCase().includes(key)) {
          serviceMatch = value;
          break;
        }
      }
      
      if (matchedService || serviceMatch) {
        const selectedService = matchedService || serviceMatch;
        updateFormData("service", selectedService);
        askNextQuestion("numGuards");
      } else {
        addMessage(`Please select a valid service from the options provided:`, "bot");
        addQuickReplies(services);
      }
    } else if (currentField === "numGuards") {
      const guards = parseInt(input);
      if (!isNaN(guards) && guards > 0) {
        updateFormData("numGuards", guards.toString());
        askNextQuestion("durationValue");
      } else {
        addMessage("Please enter a valid number of guards.", "bot");
      }
    } else if (currentField === "durationValue") {
      const duration = parseInt(input);
      if (!isNaN(duration) && duration > 0) {
        updateFormData("durationValue", duration.toString());
        askNextQuestion("durationType");
      } else {
        addMessage("Please enter a valid duration.", "bot");
      }
    } else if (["cameraRequired", "vehicleRequired", "firstAid", "walkieTalkie", "bulletProof", "fireSafety"].includes(currentField)) {
      const response = input.toLowerCase();
      if (response === "yes" || response === "y") {
        updateFormData(currentField, true);
        askNextQuestion(getNextField(currentField));
      } else if (response === "no" || response === "n") {
        updateFormData(currentField, false);
        askNextQuestion(getNextField(currentField));
      } else {
        addMessage("Please answer with 'yes' or 'no'.", "bot");
        addQuickReplies(["Yes", "No"]);
      }
    } else {
      updateFormData(currentField, input);
      askNextQuestion(getNextField(currentField));
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getNextField = (currentField) => {
    const fieldOrder = [
      "name",
      "email",
      "phone",
      "service",
      "numGuards",
      "durationValue",
      "durationType",
      "cameraRequired",
      "vehicleRequired",
      "firstAid",
      "walkieTalkie",
      "bulletProof",
      "fireSafety",
      "message",
      "confirm"
    ];
    
    const currentIndex = fieldOrder.indexOf(currentField);
    return currentIndex < fieldOrder.length - 1 ? fieldOrder[currentIndex + 1] : "confirm";
  };

  const askNextQuestion = (field) => {
    setCurrentField(field);
    
    switch (field) {
      case "name":
        addMessage("What's your name?", "bot");
        break;
      case "email":
        addMessage("What's your email address?", "bot");
        break;
      case "phone":
        addMessage("What's your phone number?", "bot");
        break;
      case "service":
        addMessage("Which security service are you interested in?", "bot");
        addQuickReplies(services);
        break;
      case "numGuards":
        addMessage("How many security guards do you need?", "bot");
        break;
      case "durationValue":
        addMessage("What's the duration of service needed?", "bot");
        break;
      case "durationType":
        addMessage("Is that in hours or months?", "bot");
        addQuickReplies(["Hours", "Months"]);
        break;
      case "cameraRequired":
        addMessage("Do you need camera surveillance? (adds ₹500)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "vehicleRequired":
        addMessage("Do you require a security vehicle? (adds ₹2500)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "firstAid":
        addMessage("Do you need guards with first aid training? (adds ₹150)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "walkieTalkie":
        addMessage("Do you need walkie-talkie equipment? (adds ₹500)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "bulletProof":
        addMessage("Do you require bulletproof vests for the guards? (adds ₹2000)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "fireSafety":
        addMessage("Do you need guards with fire safety training? (adds ₹750)", "bot");
        addQuickReplies(["Yes", "No"]);
        break;
      case "message":
        addMessage("Any additional message or requirements? (Optional)", "bot");
        break;
      case "confirm":
        showBookingSummary();
        break;
      default:
        break;
    }
  };

  const showBookingSummary = () => {
    const summary = `
Here's your booking summary:
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Service: ${formData.service}
- Number of Guards: ${formData.numGuards}
- Duration: ${formData.durationValue} ${formData.durationType}
- Camera Surveillance: ${formData.cameraRequired ? "Yes" : "No"}
- Security Vehicle: ${formData.vehicleRequired ? "Yes" : "No"}
- First Aid: ${formData.firstAid ? "Yes" : "No"}
- Walkie-Talkie: ${formData.walkieTalkie ? "Yes" : "No"}
- Bulletproof Vests: ${formData.bulletProof ? "Yes" : "No"}
- Fire Safety: ${formData.fireSafety ? "Yes" : "No"}
${formData.message ? `- Additional Message: ${formData.message}` : ""}

Estimated Cost: ₹${cost}
    `;
    
    addMessage(summary, "bot");
    addMessage("Would you like to submit this booking?", "bot");
    addQuickReplies(["Submit booking", "Cancel"]);
  };

  const submitForm = async () => {
    setIsTyping(true);
    
    try {
      const response = await fetch("/api/add-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cost
        }),
      });
      
      if (response.ok) {
        addMessage("Thank you for choosing Eyecraft Security! Your booking has been submitted successfully. Our team will contact you soon to confirm the details.", "bot");
        setIsCollectingData(false);
        setCurrentField(null);
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          numGuards: "",
          durationType: "hours",
          durationValue: "",
          cameraRequired: false,
          vehicleRequired: false,
          firstAid: false,
          walkieTalkie: false,
          bulletProof: false,
          fireSafety: false,
          message: "",
        });
      } else {
        addMessage("Sorry, there was an error submitting your booking. Please try again later or contact us directly at our office.", "bot");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      addMessage("Sorry, there was an error submitting your booking. Please try again later or contact our office directly.", "bot");
    }
    
    setIsTyping(false);
  };

  return (
    <div className="chatbot-container">
      <button 
        className={`chatbot-button ${isOpen ? "open" : ""}`} 
        onClick={toggleChat}
      >
        {isOpen ? "×" : "Chat with us"}
      </button>
      
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Eyecraft Security Assistant</h3>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={index}>
                {message.sender === "bot" && (
                  <div className="bot-message">
                    <div className="message-content">{message.text}</div>
                  </div>
                )}
                
                {message.sender === "user" && (
                  <div className="user-message">
                    <div className="message-content">{message.text}</div>
                  </div>
                )}
                
                {message.sender === "bot-options" && (
                  <div className="quick-replies">
                    {message.options.map((option, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleQuickReplyClick(option)}
                        disabled={processingInput}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="bot-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type your message..."
              ref={inputRef}
              disabled={processingInput}
            />
            <button type="submit" disabled={processingInput}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;