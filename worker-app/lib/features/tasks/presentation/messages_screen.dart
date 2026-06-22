import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/storage/auth_storage.dart';
import '../../../shared/widgets/widgets.dart';
import '../../auth/data/auth_service.dart';
import '../data/message_model.dart';
import '../data/message_service.dart';

/// Chat-style messaging screen for a task conversation.
///
/// Displays an employee ↔ manager conversation, with pull-to-refresh
/// and a bottom input bar for sending new messages.
class MessagesScreen extends StatefulWidget {
  final String taskId;

  const MessagesScreen({
    super.key,
    required this.taskId,
  });

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocusNode = FocusNode();

  List<MessageModel> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  String? _errorMessage;
  String? _currentUserId;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    _currentUserId = await AuthStorage.getUserId();
    await _fetchMessages();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  /// Fetches all messages for this task.
  Future<void> _fetchMessages() async {
    setState(() {
      _isLoading = _messages.isEmpty;
      _errorMessage = null;
    });

    try {
      final messages = await MessageService.instance.getMessages(widget.taskId);
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Impossible de charger les messages.';
          _isLoading = false;
        });
      }
    }
  }

  /// Sends a new message and appends it to the conversation.
  Future<void> _sendMessage() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
    });

    try {
      final newMessage = await MessageService.instance.sendMessage(
        widget.taskId,
        text,
      );

      if (mounted) {
        _inputController.clear();
        setState(() {
          _messages.add(newMessage);
          _isSending = false;
        });
        _scrollToBottom();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(child: Text(e.message)),
              ],
            ),
            backgroundColor: AppColors.cardBg,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erreur lors de l\'envoi du message.'),
            backgroundColor: AppColors.cardBg,
          ),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            tooltip: 'Rafraîchir',
            onPressed: _isLoading ? null : _fetchMessages,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppColors.backgroundGradient,
        ),
        child: SafeArea(
          child: Column(
            children: [
              // ── Messages list ─────────────────────────────────
              Expanded(child: _buildMessageArea()),

              // ── Input bar ─────────────────────────────────────
              _buildInputBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessageArea() {
    if (_isLoading) {
      return const LoadingView(message: 'Chargement des messages...');
    }

    if (_errorMessage != null) {
      return ErrorView(
        message: _errorMessage!,
        onRetry: _fetchMessages,
      );
    }

    if (_messages.isEmpty) {
      return const EmptyState(
        icon: Icons.chat_bubble_outline_rounded,
        title: 'Aucun message pour le moment',
        subtitle: 'Envoyez un message à votre responsable.',
        iconColor: AppColors.textSecondary,
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchMessages,
      color: AppColors.primary,
      backgroundColor: AppColors.cardBg,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final msg = _messages[index];
          final isMe = msg.senderId == _currentUserId;

          // Show a date separator when the day changes
          final showDateSeparator = index == 0 ||
              !_isSameDay(
                _messages[index - 1].createdAt,
                msg.createdAt,
              );

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (showDateSeparator) _buildDateSeparator(msg.createdAt),
              _MessageBubble(
                message: msg,
                isMe: isMe,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDateSeparator(DateTime dateTime) {
    final local = dateTime.toLocal();
    final now = DateTime.now();
    String label;

    if (_isSameDay(local, now)) {
      label = 'Aujourd\'hui';
    } else if (_isSameDay(local, now.subtract(const Duration(days: 1)))) {
      label = 'Hier';
    } else {
      final d = local.day.toString().padLeft(2, '0');
      final m = local.month.toString().padLeft(2, '0');
      label = '$d/$m/${local.year}';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(child: Divider(color: AppColors.border.withValues(alpha: 0.5))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: TextStyle(
                color: AppColors.textSecondary.withValues(alpha: 0.7),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(child: Divider(color: AppColors.border.withValues(alpha: 0.5))),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    final la = a.toLocal();
    final lb = b.toLocal();
    return la.year == lb.year && la.month == lb.month && la.day == lb.day;
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.cardBg,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // ── Text Field ──────────────────────────────
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: AppColors.background.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: _inputController,
                focusNode: _inputFocusNode,
                enabled: !_isSending,
                maxLines: 5,
                minLines: 1,
                textCapitalization: TextCapitalization.sentences,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                ),
                decoration: InputDecoration(
                  hintText: 'Écrire un message...',
                  hintStyle: TextStyle(
                    color: AppColors.textSecondary.withValues(alpha: 0.6),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // ── Send Button ─────────────────────────────
          Container(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              onPressed: _isSending ? null : _sendMessage,
              icon: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              splashRadius: 22,
            ),
          ),
        ],
      ),
    );
  }
}

/// A single message bubble in the conversation.
class _MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;

  const _MessageBubble({
    required this.message,
    required this.isMe,
  });

  @override
  Widget build(BuildContext context) {
    final localTime = message.createdAt.toLocal();
    final timeStr =
        '${localTime.hour.toString().padLeft(2, '0')}:${localTime.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) _buildAvatar(),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.cardBg,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: isMe
                      ? const Radius.circular(16)
                      : const Radius.circular(4),
                  bottomRight: isMe
                      ? const Radius.circular(4)
                      : const Radius.circular(16),
                ),
                border: Border.all(
                  color: isMe
                      ? AppColors.primary.withValues(alpha: 0.3)
                      : AppColors.border,
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment:
                    isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  // Sender name (only for the other person)
                  if (!isMe)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        message.sender.name,
                        style: TextStyle(
                          color: _getRoleColor(message.sender.role),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  // Message body
                  Text(
                    message.message,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Timestamp
                  Text(
                    timeStr,
                    style: TextStyle(
                      color: AppColors.textSecondary.withValues(alpha: 0.7),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (isMe) _buildAvatar(),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    final roleColor = _getRoleColor(message.sender.role);
    final initials = _getInitials(message.sender.name);

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: roleColor.withValues(alpha: 0.2),
        shape: BoxShape.circle,
        border: Border.all(color: roleColor.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: roleColor,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'MANAGER':
      case 'ADMIN':
        return AppColors.accent;
      case 'EMPLOYEE':
        return AppColors.primary;
      default:
        return AppColors.textSecondary;
    }
  }

  String _getInitials(String name) {
    if (name.isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}
