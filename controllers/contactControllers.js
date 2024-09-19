const Contact = require('../models/contact'); // Contact model schema from the database
const Joi = require('joi'); // Joi module for input validation

// Joi schema to validate contact fields for adding or updating a contact
const contactSchema = Joi.object({
    name: Joi.string().required(), // name must be a string and is required
    email: Joi.string().email().required(), // email must be valid and is required
    phone: Joi.string().required(), // phone must be a string and is required
    favorite: Joi.boolean(), // favorite must be a boolean, optional
});

// Joi schema to validate the favorite field for updating the favorite status
const favoriteSchema = Joi.object({
    favorite: Joi.boolean().required(), // favorite must be a boolean and is required
});

// Function to list contacts for a user with pagination and optional filtering by 'favorite'
const listContacts = async (userId, { page = 1, limit = 20, favorite }) => {
    const skip = (page - 1) * limit; // Calculate how many records to skip based on pagination
    const filter = { owner: userId }; // Filter contacts based on the user who owns them
    if (favorite !== undefined) filter.favorite = favorite === 'true'; // Optionally filter by favorite status
    
    return await Contact.find(filter) // Find contacts matching the filter
        .skip(skip) // Skip contacts for pagination
        .limit(parseInt(limit)) // Limit the number of contacts per page
        .populate('owner', 'email subscription'); // Populate the 'owner' field with email and subscription info
};

// Function to get a contact by its ID
const getContactById = async (contactId) => await Contact.findById(contactId);

// Function to add a new contact to the database
const addContact = async (body) => {
    const contact = new Contact(body); // Create a new contact instance
    return await contact.save(); // Save the contact to the database
};

// Function to update an existing contact by ID
const updateContact = async (contactId, body) => {
    return await Contact.findByIdAndUpdate(contactId, body, { new: true }); // Update the contact and return the updated version
};

// Function to delete a contact by its ID
const removeContact = async (contactId) => await Contact.findByIdAndDelete(contactId);

// Route handler to get a list of contacts (supports pagination and filtering)
const getListContacts = async (req, res, next) => {
    try {
        const contacts = await listContacts(req.user._id, req.query); // Fetch contacts for the logged-in user with pagination and filtering
        res.status(200).json(contacts); // Return the contacts in the response
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Route handler to get a single contact by its ID
const getContact = async (req, res, next) => {
    try {
        const contact = await getContactById(req.params.contactId); // Fetch contact by ID
        if (!contact) return res.status(404).json({ message: 'Contact not found' }); // Return 404 if not found

        // Ensure that the logged-in user is the owner of the contact
        if (contact.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' }); // Return 403 if user is not the owner
        }

        res.status(200).json(contact); // Return the contact in the response
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Route handler to add a new contact
const addContactHandler = async (req, res, next) => {
    try {
        const { error } = contactSchema.validate(req.body); // Validate request body against the contact schema
        if (error) {
            return res.status(400).json({ message: `Missing required ${error.details[0].path[0]} field` }); // Return 400 if validation fails
        }

        const newContact = await addContact({
            ...req.body,
            owner: req.user._id, // Set the logged-in user as the owner of the contact
        });
        res.status(201).json(newContact); // Return the newly created contact in the response
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Route handler to update an existing contact by ID
const updateContactHandler = async (req, res, next) => {
    try {
        if (!Object.keys(req.body).length) {
            return res.status(400).json({ message: 'Missing fields' }); // Return 400 if request body is empty
        }

        const contact = await getContactById(req.params.contactId); // Fetch the contact by ID
        if (!contact) return res.status(404).json({ message: 'Contact not found' }); // Return 404 if not found

        // Ensure that the logged-in user is the owner of the contact
        if (contact.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' }); // Return 403 if user is not the owner
        }

        const updatedContact = await updateContact(req.params.contactId, req.body); // Update the contact
        res.status(200).json(updatedContact); // Return the updated contact in the response
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Route handler to delete a contact by ID
const removeContactHandler = async (req, res, next) => {
    try {
        const contact = await getContactById(req.params.contactId); // Fetch the contact by ID
        if (!contact) return res.status(404).json({ message: 'Contact not found' }); // Return 404 if not found

        // Ensure that the logged-in user is the owner of the contact
        if (contact.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' }); // Return 403 if user is not the owner
        }

        await removeContact(req.params.contactId); // Delete the contact
        res.status(200).json({ message: 'Contact deleted' }); // Return a success message
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Route handler to update the favorite status of a contact
const updateFavoriteStatusHandler = async (req, res, next) => {
    try {
        const { error } = favoriteSchema.validate(req.body); // Validate the favorite field in the request body
        if (error) {
            return res.status(400).json({ message: 'Missing field favorite' }); // Return 400 if validation fails
        }

        const contact = await getContactById(req.params.contactId); // Fetch the contact by ID
        if (!contact) return res.status(404).json({ message: 'Contact not found' }); // Return 404 if not found

        // Ensure that the logged-in user is the owner of the contact
        if (contact.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' }); // Return 403 if user is not the owner
        }

        const updatedContact = await updateContact(req.params.contactId, req.body); // Update the favorite status
        res.status(200).json(updatedContact); // Return the updated contact
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
};

// Exporting the functions for use in route handlers
module.exports = {
    getListContacts, // Handles listing contacts with pagination and filtering
    getContact, // Handles fetching a single contact by ID
    addContactHandler, // Handles adding a new contact
    updateContactHandler, // Handles updating an existing contact
    removeContactHandler, // Handles deleting a contact
    updateFavoriteStatusHandler, // Handles updating the favorite status of a contact
};
