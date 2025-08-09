const {
    createNote,
    getAllNotes,
    getNote,
    updateNote,
    deleteNote,
    togglePinNote,
    lockNote,
    unlockNote,
    getNoteStatistics,
    searchNotes
} = require('../controllers/note.controller');
const authy = require('../middlewares/auth.middleware');
const Router = require('express').Router;
const router = Router();

// Create new note
router.route("/create").post(authy, createNote);

// Get all notes with filtering and pagination
router.route("/all").get(authy, getAllNotes);

// Get note statistics
router.route("/statistics").get(authy, getNoteStatistics);

// Search notes
router.route("/search").get(authy, searchNotes);

// Get single note
router.route("/:noteId").get(authy, getNote);

// Update note
router.route("/:noteId").put(authy, updateNote);

// Delete note
router.route("/:noteId").delete(authy, deleteNote);

// Toggle pin status
router.route("/:noteId/pin").patch(authy, togglePinNote);

// Lock note with password
router.route("/:noteId/lock").patch(authy, lockNote);

// Unlock note with password
router.route("/:noteId/unlock").patch(authy, unlockNote);

module.exports = router; 