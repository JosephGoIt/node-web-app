const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.js');
const {
    getListContacts,
    getContact,
    addContactHandler,
    updateContactHandler,
    removeContactHandler,
    updateFavoriteStatusHandler,
} = require('../../controllers/contactControllers.js');

router.get('/', auth, getListContacts);
router.get('/:contactId', auth, getContact);
router.post('/', auth, addContactHandler);
router.put('/:contactId', auth, updateContactHandler);
router.delete('/:contactId', auth, removeContactHandler);
router.patch('/:contactId/favorite', auth, updateFavoriteStatusHandler);

module.exports = {
    router,
};