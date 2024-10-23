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

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the contact
 *         name:
 *           type: string
 *           description: The name of the contact
 *         email:
 *           type: string
 *           description: The contact's email
 *         phone:
 *           type: string
 *           description: The contact's phone number
 *         favorite:
 *           type: boolean
 *           description: Whether the contact is marked as favorite
 *         owner:
 *           type: string
 *           description: The ID of the user who owns the contact
 *       example:
 *         id: 609d9f6e9675da0017b60ae0
 *         name: John Doe
 *         email: johndoe@example.com
 *         phone: +123456789
 *         favorite: true
 *         owner: 609d9f6e9675da0017b60adf
 *     NewContact:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the contact
 *         email:
 *           type: string
 *           description: The contact's email
 *         phone:
 *           type: string
 *           description: The contact's phone number
 *         favorite:
 *           type: boolean
 *           description: Whether the contact is marked as favorite
 *       example:
 *         name: John Doe
 *         email: johndoe@example.com
 *         phone: +123456789
 *         favorite: true
 *     UpdateContact:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         favorite:
 *           type: boolean
 *       example:
 *         name: John Doe
 *         email: johndoe@example.com
 *         phone: +123456789
 *         favorite: true
 *     UpdateFavoriteStatus:
 *       type: object
 *       required:
 *         - favorite
 *       properties:
 *         favorite:
 *           type: boolean
 *       example:
 *         favorite: true
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get a list of contacts for the logged-in user
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: The number of contacts per page
 *       - in: query
 *         name: favorite
 *         schema:
 *           type: boolean
 *         description: Filter by favorite contacts
 *     responses:
 *       200:
 *         description: A list of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contact'
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.get('/', auth, getListContacts);

/**
 * @swagger
 * /api/contacts/{contactId}:
 *   get:
 *     summary: Get a contact by its ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the contact
 *     responses:
 *       200:
 *         description: The contact details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.get('/:contactId', auth, getContact);

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Create a new contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewContact'
 *     responses:
 *       201:
 *         description: The contact was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: Missing required fields or invalid input
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.post('/', auth, addContactHandler);

/**
 * @swagger
 * /api/contacts/{contactId}:
 *   put:
 *     summary: Update a contact by its ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateContact'
 *     responses:
 *       200:
 *         description: The updated contact
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: Missing fields or invalid input
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.put('/:contactId', auth, updateContactHandler);

/**
 * @swagger
 * /api/contacts/{contactId}:
 *   delete:
 *     summary: Delete a contact by its ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the contact
 *     responses:
 *       200:
 *         description: Contact deleted
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.delete('/:contactId', auth, removeContactHandler);

/**
 * @swagger
 * /api/contacts/{contactId}/favorite:
 *   patch:
 *     summary: Update the favorite status of a contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateFavoriteStatus'
 *     responses:
 *       200:
 *         description: The favorite status was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: Missing favorite field or invalid input
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized, access token missing or invalid
 */
router.patch('/:contactId/favorite', auth, updateFavoriteStatusHandler);

module.exports = {
    router,
};