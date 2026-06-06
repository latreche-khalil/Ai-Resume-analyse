"""
Coaching endpoints for chat and interview simulation.

Requirements: 12.1-12.11, 13.1-13.10
"""
import json
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.models.interview import InterviewSession, InterviewQuestion, InterviewAnswer
from app.models.analysis_record import AnalysisRecord
from app.models.gap_report import GapReport
from app.models.xai_report import XAIReport
from app.schemas.coaching import InterviewSimulationStart, InterviewAnswerSubmit
from app.models.chat import ChatSession, ChatMessage
from app.utils.logger import logger


router = APIRouter(prefix="/coaching")


# Chat endpoints
@router.post("/chat/session", status_code=status.HTTP_201_CREATED)
@router.post("/chat/sessions", status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    cv_document_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new chat session. Requirements: 12.1"""
    from app.models.cv_document import CVDocument

    is_recruiter = current_user.role == 'recruiter'

    if cv_document_id:
        # Recruiters can access any candidate's CV by ID (they are screening it)
        # Candidates can only access their own CVs
        filters = [
            CVDocument.id == cv_document_id,
            CVDocument.processing_status == 'completed',
            CVDocument.deleted_at.is_(None)
        ]
        if not is_recruiter:
            filters.append(CVDocument.user_id == current_user.id)

        cv_result = await db.execute(select(CVDocument).where(*filters))
        cv = cv_result.scalar_one_or_none()
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV document not found or access denied."
            )
    else:
        if is_recruiter:
            # Recruiters must provide a cv_document_id (they don't have their own CVs)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recruiters must provide a cv_document_id to start a selection assistant session."
            )
        # Candidate: find their latest processed CV
        cv_result = await db.execute(
            select(CVDocument).where(
                CVDocument.user_id == current_user.id,
                CVDocument.processing_status == 'completed',
                CVDocument.deleted_at.is_(None)
            ).order_by(CVDocument.created_at.desc()).limit(1)
        )
        cv = cv_result.scalar_one_or_none()
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No processed CV found. Please upload your CV first."
            )

    session = ChatSession(
        user_id=current_user.id,
        context_data=json.dumps({"cv_document_id": str(cv.id)})  # Store as JSON string
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": str(session.id), "created_at": session.created_at}


from pydantic import BaseModel as _PydanticBase

class _ChatMsg(_PydanticBase):
    message: str

@router.post("/chat/{session_id}/message")
@router.post("/chat/sessions/{session_id}/messages")
async def send_chat_message(
    session_id: UUID,
    body: _ChatMsg,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send message and get AI response using RAG context. Requirements: 12.2, 12.3"""
    message = body.message
    logger.info(f"=== CHAT MESSAGE RECEIVED === Session: {session_id}, User: {current_user.id}, Message: {message[:50]}...")
    
    from app.models.cv_document import CVDocument
    from sqlalchemy import select

    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        logger.error(f"Chat session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")

    # ── RAG: retrieve relevant CV chunks for context ───────────────────────
    rag_context = ""
    context_dict = json.loads(session.context_data) if session.context_data else {}
    cv_document_id = context_dict.get("cv_document_id")
    if cv_document_id:
        try:
            from app.services.nlp.rag_pipeline import rag_pipeline
            from uuid import UUID as _UUID
            chunks = await rag_pipeline.semantic_search(
                query=message,
                document_ids=[_UUID(cv_document_id)],
                top_k=3,
            )
            if chunks:
                rag_context = "\n\n".join(c["text"] for c in chunks)
        except Exception as rag_err:
            logger.warning(f"Coaching RAG failed: {rag_err}")

    # ── Analysis Context: fetch latest match results, gaps, and roadmap ────
    analysis_context = ""
    if cv_document_id:
        try:
            # Fetch latest analysis for this CV
            analysis_stmt = select(AnalysisRecord).where(
                AnalysisRecord.cv_document_id == UUID(cv_document_id)
            ).order_by(AnalysisRecord.created_at.desc()).limit(1)
            analysis_res = await db.execute(analysis_stmt)
            analysis = analysis_res.scalar_one_or_none()
            
            if analysis:
                # Fetch associated gap and XAI reports
                gap_res = await db.execute(select(GapReport).where(GapReport.analysis_record_id == analysis.id))
                gap = gap_res.scalar_one_or_none()
                
                xai_res = await db.execute(select(XAIReport).where(XAIReport.analysis_record_id == analysis.id))
                xai = xai_res.scalar_one_or_none()
                
                # Build summarized analysis context
                analysis_context = f"""
CANDIDATE ANALYSIS RESULTS:
- Match Score: {analysis.match_score:.0%}
- Matching Skills: {', '.join(analysis.matching_skills or [])}
- Missing Skills: {', '.join(analysis.missing_skills or [])}
- Seniority Alignment: {analysis.seniority_alignment.get('cv_level', 'N/A') if analysis.seniority_alignment else 'N/A'} (Required: {analysis.seniority_alignment.get('jd_level', 'N/A') if analysis.seniority_alignment else 'N/A'})

GAP ANALYSIS & ROADMAP:
- Critical Gaps: {', '.join([g.get('skill', '') for g in (gap.critical_gaps or [])]) if gap else "None identified."}
- Roadmap: {', '.join([r.get('skill', '') for r in (gap.learning_roadmap or [])]) if gap else "No roadmap generated yet."}

AI EXPLANATION (XAI):
- Main Strengths: {', '.join([e.get('claim', '') for e in (xai.evidence_for_match or [])[:3]]) if xai else "N/A"}
- Areas to Improve: {', '.join([e.get('gap', '') for e in (xai.evidence_against_match or [])[:3]]) if xai else "N/A"}
"""
        except Exception as analysis_err:
            logger.warning(f"Coaching analysis context fetch failed: {analysis_err}")

    # ── Get chat history for persistence ──────────────────────────────────
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = list(reversed(history_result.scalars().all()))
    history_text = "\n".join(f"{m.role}: {m.content}" for m in history[-6:])

    # ── Build prompt: History + CV Chunks + Analysis + Message ─────────────
    if current_user.role == 'recruiter':
        prompt = f"""You are an expert AI Recruiter Assistant and Talent Acquisition Consultant. 
You have FULL ACCESS to the candidate's CV and their latest AI-powered match analysis results.
Your goal is to assist the recruiter in evaluating this candidate, understanding their skill gaps, suggesting interview questions/probes, and deciding whether they are a good fit for selection.

CANDIDATE CV CONTEXT (Relevant chunks from CV):
{rag_context if rag_context else "No specific CV chunks found for this query."}

{analysis_context if analysis_context else "LATEST ANALYSIS: No detailed analysis found for this candidate yet."}

CONVERSATION HISTORY:
{history_text if history_text else "This is the start of your conversation."}

RECRUITER MESSAGE: {message}

INSTRUCTIONS:
1. Provide highly specific, recruiter-focused, data-driven advice based on the provided ANALYSIS and CV.
2. Help the recruiter assess the candidate's strengths, weaknesses, seniority fit, and suitability for the job.
3. Suggest concrete interview questions or trial project ideas targeting the candidate's gaps.
4. Keep answers highly professional, analytical, objective, and concise. Avoid generic coaching platitudes.
"""
    else:
        prompt = f"""You are an expert AI Career Coach and Personal Consultant. 
You have FULL ACCESS to the candidate's CV and their latest AI-powered analysis results.

CANDIDATE CV CONTEXT (Relevant chunks from CV):
{rag_context if rag_context else "No specific CV chunks found for this query."}

{analysis_context if analysis_context else "LATEST ANALYSIS: No detailed analysis found for this candidate yet."}

CONVERSATION HISTORY:
{history_text if history_text else "This is the start of your conversation."}

CANDIDATE MESSAGE: {message}

INSTRUCTIONS:
1. Provide highly specific, data-driven advice based on the provided ANALYSIS and CV.
2. If the candidate asks about their score, refer to the Match Score ({analysis.match_score if 'analysis' in locals() and analysis else 'N/A'}).
3. If they ask about improvement, reference the suggested Roadmap and Gaps.
4. Be professional, encouraging, and act as if you've studied their full profile.
5. Keep answers concise but insightful. Avoid generic platitudes.
"""

    # Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=message)
    db.add(user_msg)

    try:
        from app.services.nlp.llm_client import llm_client
        logger.info("Calling LLM client for chat response...")
        ai_response = await llm_client.generate(
            prompt=prompt,
            task_type="fast",
            temperature=0.7,
            max_tokens=1024
        )
        
        logger.info(f"LLM response received: {ai_response[:100] if ai_response else 'None'}...")
        
        if not ai_response:
            # Fallback response when AI service is unavailable
            ai_response = "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment. In the meantime, you can review your analysis results or explore other features."
            logger.warning("AI service returned empty response, using fallback message")

        ai_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_response)
        db.add(ai_msg)
        session.message_count = (session.message_count or 0) + 2
        await db.commit()

        return {"message": ai_response}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        
        # Save a fallback message instead of raising exception
        fallback_msg = "I'm experiencing technical difficulties at the moment. Please try again shortly. If the issue persists, you can still access your CV analysis and other features."
        ai_msg = ChatMessage(session_id=session_id, role="assistant", content=fallback_msg)
        db.add(ai_msg)
        session.message_count = (session.message_count or 0) + 2
        await db.commit()
        
        return {"message": fallback_msg}


@router.get("/chat/sessions/{session_id}/messages")
async def get_chat_history(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get chat history. Requirements: 12.3"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return {"messages": [{"role": m.role, "content": m.content} for m in messages]}


@router.get("/chat/sessions")
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    """Get user's chat session history."""
    import json
    
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    
    items = []
    for session in sessions:
        # Get first user message as preview
        first_msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id, ChatMessage.role == 'user')
            .order_by(ChatMessage.created_at)
            .limit(1)
        )
        first_msg = first_msg_result.scalar_one_or_none()
        preview = first_msg.content[:60] + "..." if first_msg and len(first_msg.content) > 60 else (first_msg.content if first_msg else "New conversation")
        
        items.append({
            "id": str(session.id),
            "title": session.title or preview,
            "message_count": session.message_count or 0,
            "is_active": session.is_active,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        })
    
    return {"items": items, "total": len(items)}


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and all associated messages."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Ownership check
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this chat session"
        )
    
    # Delete session (cascade will delete messages)
    await db.delete(session)
    await db.commit()
    
    return {"message": "Chat session deleted successfully"}


@router.post("/interview/start")
async def start_interview(
    data: InterviewSimulationStart,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start interview simulation using context from CV and Gaps. Requirements: 13.1"""
    logger.info(f"=== INTERVIEW START ENDPOINT CALLED ===")
    logger.info(f"User: {current_user.id if current_user else 'None'}")
    logger.info(f"Data: {data}")
    
    from app.models.cv_document import CVDocument
    from app.models.job_description import JobDescription
    
    try:
        logger.info(f"Starting interview for user {current_user.id} with JD {data.job_description_id}")
        
        # Get latest CV for user
        cv_res = await db.execute(
            select(CVDocument).where(
                CVDocument.user_id == current_user.id,
                CVDocument.deleted_at.is_(None)
            ).order_by(CVDocument.created_at.desc()).limit(1)
        )
        cv = cv_res.scalar_one_or_none()
        logger.info(f"Found CV: {cv.id if cv else 'None'}")
        
        # Get JD
        jd_res = await db.execute(select(JobDescription).where(JobDescription.id == data.job_description_id))
        jd = jd_res.scalar_one_or_none()
        logger.info(f"Found JD: {jd.id if jd else 'None'}")
        
        if not jd:
            raise HTTPException(status_code=404, detail="Job Description not found")

        # Fetch context: Analysis & Gaps
        analysis_context = ""
        if cv:
            analysis_stmt = select(AnalysisRecord).where(
                AnalysisRecord.cv_document_id == cv.id,
                AnalysisRecord.job_description_id == jd.id
            ).order_by(AnalysisRecord.created_at.desc()).limit(1)
            analysis_res = await db.execute(analysis_stmt)
            analysis = analysis_res.scalar_one_or_none()
            
            if analysis:
                gap_res = await db.execute(select(GapReport).where(GapReport.analysis_record_id == analysis.id))
                gap = gap_res.scalar_one_or_none()
                if gap:
                    gaps_text = ", ".join([g.get('skill', '') for g in (gap.critical_gaps or [])])
                    analysis_context = f"Identified Skill Gaps for this candidate: {gaps_text}"

        # Capture user_id before any logic
        current_user_id = current_user.id
        
        logger.info(f"Creating interview session...")
        
        context_data_dict = {
            "difficulty": data.difficulty or "mid",
            "interview_type": data.interview_type or "mixed",
            "mode": data.mode or "training",
            "analysis_context": analysis_context
        }

        session = InterviewSession(
            user_id=current_user_id,
            job_description_id=data.job_description_id,
            status="in_progress",
            context_data=json.dumps(context_data_dict)  # Convert to JSON string
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        logger.info(f"Session created: {session.id}")

        # Generate specialized first question using LLM
        first_q_text = f"Welcome. Can you explain your experience as a {jd.title} and how you've handled tasks related to {jd.title}?"
        try:
            from app.services.nlp.llm_client import llm_client
            prompt = f"""You are a professional interviewer for the position: {jd.title}.
CONTEXT: {analysis_context}
DIFFICULTY: {data.difficulty or 'mid'}
TYPE: {data.interview_type or 'mixed'}

TASK: Generate the FIRST interview question. 
If there are skill gaps, try to probe them gently.
Return ONLY the question text. Keep it professional and concise."""
            
            q = await llm_client.generate(prompt=prompt, task_type="fast", temperature=0.7)
            if q:
                first_q_text = q.strip()
        except Exception as e:
            logger.warning(f"Failed to generate first question: {e}")

        # Map interview_type to valid question_type
        question_type_map = {
            "technical": "technical",
            "behavioral": "behavioral",
            "mixed": "behavioral"  # Start with behavioral for mixed interviews
        }
        question_type = question_type_map.get(data.interview_type, "behavioral")
        
        question = InterviewQuestion(
            session_id=session.id,
            question_text=first_q_text,
            question_type=question_type,
            difficulty_level=1,
            sequence_number=1,
        )
        db.add(question)
        await db.commit()
        
        logger.info(f"Question created: {question.id}")
        
        return {
            "session_id": str(session.id),
            "question_id": str(question.id),
            "question": question.question_text
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Interview start error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start interview: {str(e)}"
        )

@router.post("/interview/sessions/{session_id}/answer")
async def submit_answer(
    session_id: UUID,
    data: InterviewAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit interview answer and evaluate it. Requirements: 13.3"""
    from app.models.interview import InterviewAnswer, InterviewQuestion

    # ── Upsert: check if answer already exists for this question ────────────
    existing_res = await db.execute(
        select(InterviewAnswer).where(InterviewAnswer.question_id == data.question_id)
    )
    answer = existing_res.scalar_one_or_none()

    if answer:
        # Update existing answer text (re-evaluate)
        answer.answer_text = data.answer_text
        logger.info(f"Updating existing answer for question {data.question_id}")
    else:
        # Create new answer
        answer = InterviewAnswer(
            question_id=data.question_id,
            answer_text=data.answer_text
        )
        db.add(answer)
        logger.info(f"Creating new answer for question {data.question_id}")

    # ── Default values ───────────────────────────────────────────────────────
    scores = {"relevance": 0.75, "completeness": 0.70, "clarity": 0.80}
    feedback_text = "Good answer. Keep practicing."
    strengths_list = ["Clear communication", "Relevant experience cited"]
    improvements_list = ["Add more specific metrics", "Structure answer with STAR method"]

    # ── Evaluate answer using LLM ────────────────────────────────────────────
    try:
        from app.services.nlp.llm_client import llm_client
        eval_prompt = f"""You are an expert interview coach. Evaluate the following interview answer thoroughly.

Answer: {data.answer_text}

Return ONLY a valid JSON object with this exact structure:
{{
  "relevance": 0.0,
  "completeness": 0.0,
  "clarity": 0.0,
  "feedback": "Overall feedback in 1-2 sentences.",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement suggestion 1", "Improvement suggestion 2"]
}}

Rules:
- relevance, completeness, clarity must be floats between 0.0 and 1.0
- strengths: list of 2-3 specific things done well
- improvements: list of 2-3 concrete suggestions to improve
- Be specific and actionable, not generic"""

        eval_response = await llm_client.generate(
            prompt=eval_prompt, task_type="fast", temperature=0.3, max_tokens=400
        )

        from app.utils.json_parser import json_parser
        if eval_response:
            try:
                parsed = json_parser.extract_json_object(eval_response)
                scores = {
                    "relevance": float(parsed.get("relevance", 0.75)),
                    "completeness": float(parsed.get("completeness", 0.70)),
                    "clarity": float(parsed.get("clarity", 0.80)),
                }
                feedback_text = parsed.get("feedback", feedback_text)
                raw_strengths = parsed.get("strengths", strengths_list)
                raw_improvements = parsed.get("improvements", improvements_list)
                if isinstance(raw_strengths, list):
                    strengths_list = raw_strengths
                if isinstance(raw_improvements, list):
                    improvements_list = raw_improvements
            except Exception as parse_err:
                logger.warning(f"Failed to parse evaluation JSON: {parse_err}")

    except Exception as llm_err:
        logger.warning(f"LLM evaluation failed, using defaults: {llm_err}")

    # ── Persist scores ───────────────────────────────────────────────────────
    answer.relevance_score = scores["relevance"]
    answer.completeness_score = scores["completeness"]
    answer.clarity_score = scores["clarity"]
    answer.feedback = feedback_text
    answer.strengths = json.dumps(strengths_list)
    answer.improvements = json.dumps(improvements_list)

    # ── Check session completion ─────────────────────────────────────────────
    try:
        questions_count_res = await db.execute(
            select(func.count(InterviewQuestion.id)).where(InterviewQuestion.session_id == session_id)
        )
        count = questions_count_res.scalar_one()

        if count >= 5:
            session_res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
            interview_session = session_res.scalar_one_or_none()
            if interview_session:
                interview_session.status = "completed"
                interview_session.completed_at = datetime.now(timezone.utc)

        await db.commit()

        return {
            "evaluation": {
                "scores": scores,
                "feedback": feedback_text,
                "strengths": strengths_list,
                "improvements": improvements_list
            },
            "status": "completed" if count >= 5 else "in_progress"
        }

    except Exception as e:
        logger.error(f"Evaluation commit error: {e}")
        await db.rollback()
        return {
            "evaluation": {
                "scores": scores,
                "feedback": feedback_text,
                "strengths": strengths_list,
                "improvements": improvements_list
            },
            "status": "in_progress"
        }



@router.get("/interview/sessions/{session_id}/next-question")
async def get_interview_next_question(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the next adaptive question for the session."""
    from app.models.interview import InterviewAnswer

    # Ownership check
    session_res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = session_res.scalar_one_or_none()
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get ALL questions for this session ordered by sequence
    all_q_res = await db.execute(
        select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.sequence_number)
    )
    all_questions = all_q_res.scalars().all()
    count = len(all_questions)

    # ── KEY FIX: Return existing unanswered question if one exists ──────────
    for q in all_questions:
        ans_res = await db.execute(
            select(InterviewAnswer).where(InterviewAnswer.question_id == q.id)
        )
        existing_ans = ans_res.scalar_one_or_none()
        if existing_ans is None:
            # This question has no answer yet — return it instead of creating a new one
            logger.info(f"Resuming: returning existing unanswered question {q.id} (seq {q.sequence_number})")
            return {
                "id": str(q.id),
                "text": q.question_text,
                "type": q.question_type or "adaptive",
                "question": q.question_text
            }

    # All existing questions are answered — check if session is complete
    if count >= 5:
        return {"question": None, "status": "completed"}

    # Build full conversation history from ALL answered Q&A pairs
    conversation_history = []
    for prev_q in all_questions:
        ans_res = await db.execute(
            select(InterviewAnswer).where(InterviewAnswer.question_id == prev_q.id)
        )
        prev_ans = ans_res.scalar_one_or_none()
        if prev_ans:
            conversation_history.append({
                "q_num": prev_q.sequence_number,
                "question": prev_q.question_text,
                "answer": prev_ans.answer_text,
                "scores": {
                    "relevance": float(prev_ans.relevance_score or 0),
                    "completeness": float(prev_ans.completeness_score or 0),
                    "clarity": float(prev_ans.clarity_score or 0),
                }
            })

    # Format conversation for the prompt
    history_text = ""
    for item in conversation_history:
        avg_score = sum(item["scores"].values()) / 3
        score_label = "Excellent" if avg_score >= 0.85 else "Good" if avg_score >= 0.70 else "Needs improvement"
        history_text += f"\nQ{item['q_num']}: {item['question']}\nA{item['q_num']}: {item['answer'][:400]}{'...' if len(item['answer']) > 400 else ''}\n[Score: {score_label} ({avg_score:.0%})]\n"

    next_q_text = "Tell me more about your experience."
    try:
        from app.services.nlp.llm_client import llm_client
        from app.models.job_description import JobDescription
        jd_res = await db.execute(select(JobDescription).where(JobDescription.id == session.job_description_id))
        jd = jd_res.scalar_one_or_none()

        if jd:
            context_dict = json.loads(session.context_data) if session.context_data else {}
            ctx = context_dict.get("analysis_context", "")
            diff = context_dict.get("difficulty", "mid")
            itype = context_dict.get("interview_type", "mixed")

            prompt = f"""You are a professional interviewer for the position: {jd.title}.
DIFFICULTY: {diff} | TYPE: {itype}
CANDIDATE SKILL GAPS: {ctx if ctx else "Not specified"}

FULL INTERVIEW CONVERSATION SO FAR:
{history_text if history_text else "This is the first question."}

TASK: Generate Question {count + 1} of 5.
Rules:
- Build NATURALLY on what the candidate has already said
- If a previous answer was weak (Needs improvement), probe deeper on that topic
- If a previous answer was strong, move to a new related skill area
- Do NOT repeat topics already covered well
- Keep it conversational and progressive
Return ONLY the question text, no preamble."""

            q_text = await llm_client.generate(prompt=prompt, task_type="fast", temperature=0.7)
            if q_text:
                next_q_text = q_text.strip()
    except Exception as e:
        logger.warning(f"Next question generation failed: {e}")

    next_q = InterviewQuestion(
        session_id=session_id,
        question_text=next_q_text,
        question_type="adaptive",
        difficulty_level=count + 1,
        sequence_number=count + 1,
    )
    db.add(next_q)
    await db.commit()

    return {
        "id": str(next_q.id),
        "text": next_q.question_text,
        "type": "adaptive",
        "question": next_q.question_text
    }


@router.get("/interview/sessions/{session_id}/report")
async def get_interview_report(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get interview report with questions and answers. Requirements: 13.6"""
    from app.models.interview import InterviewAnswer
    
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Ownership check — prevent accessing other users' sessions
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this interview session"
        )
    
    # Get all questions and answers for this session
    questions_result = await db.execute(
        select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.sequence_number)
    )
    questions = questions_result.scalars().all()
    
    # Build Q&A list
    qa_list = []
    total_scores = []
    
    for q in questions:
        answer_result = await db.execute(
            select(InterviewAnswer).where(InterviewAnswer.question_id == q.id)
        )
        answer = answer_result.scalar_one_or_none()
        
        qa_list.append({
            "question_id": str(q.id),
            "question_text": q.question_text,
            "question_type": q.question_type,
            "sequence_number": q.sequence_number,
            "answer_text": answer.answer_text if answer else None,
            "relevance_score": float(answer.relevance_score) if answer and answer.relevance_score else None,
            "completeness_score": float(answer.completeness_score) if answer and answer.completeness_score else None,
            "clarity_score": float(answer.clarity_score) if answer and answer.clarity_score else None,
            "feedback": answer.feedback if answer else None
        })
        
        # Collect scores for average calculation
        if answer and answer.relevance_score and answer.completeness_score and answer.clarity_score:
            avg = (float(answer.relevance_score) + float(answer.completeness_score) + float(answer.clarity_score)) / 3
            total_scores.append(avg)
    
    # Calculate overall average score
    avg_score = sum(total_scores) / len(total_scores) if total_scores else 0.75
    
    # Update session overall_score if not set
    if not session.overall_score:
        session.overall_score = avg_score
        await db.commit()
    
    import json
    context_dict = json.loads(session.context_data) if session.context_data else {}
    
    return {
        "session_id": str(session_id),
        "overall_score": float(session.overall_score or avg_score),
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "difficulty": context_dict.get("difficulty", "mid"),
        "interview_type": context_dict.get("interview_type", "mixed"),
        "mode": context_dict.get("mode", "training"),
        "questions_answers": qa_list,
        "report": "Interview completed successfully. Review your answers below to identify areas for improvement."
    }


@router.get("/interview/sessions")
async def get_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """Get user's interview session history."""
    from app.models.job_description import JobDescription
    
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    
    items = []
    for session in sessions:
        # Get JD title if available
        jd_title = None
        if session.job_description_id:
            jd_result = await db.execute(
                select(JobDescription).where(JobDescription.id == session.job_description_id)
            )
            jd = jd_result.scalar_one_or_none()
            if jd:
                jd_title = jd.title
        
        # Get question count
        q_count_result = await db.execute(
            select(func.count(InterviewQuestion.id))
            .where(InterviewQuestion.session_id == session.id)
        )
        question_count = q_count_result.scalar_one()
        
        context_dict = json.loads(session.context_data) if session.context_data else {}
        
        items.append({
            "id": str(session.id),
            "status": session.status,
            "overall_score": float(session.overall_score) if session.overall_score else None,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "job_title": jd_title,
            "difficulty": context_dict.get("difficulty", "mid"),
            "interview_type": context_dict.get("interview_type", "mixed"),
            "question_count": question_count
        })
    
    return {"items": items, "total": len(items)}


@router.delete("/interview/sessions/{session_id}")
async def delete_interview_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an interview session and all associated data."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Ownership check
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this interview session"
        )
    
    # Delete session (cascade will delete questions and answers)
    await db.delete(session)
    await db.commit()
    
    return {"message": "Interview session deleted successfully"}
